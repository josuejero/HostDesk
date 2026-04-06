<?php

declare(strict_types=1);

namespace HostDesk\Api\Services;

use HostDesk\Api\ApiException;
use HostDesk\Api\Repositories\MetricsRepository;
use HostDesk\Api\Repositories\ProspectRepository;
use HostDesk\Api\Repositories\UserRepository;
use PDO;

final class ProspectService
{
    public function __construct(
        private readonly PDO $db,
        private readonly ProspectRepository $prospectRepository,
        private readonly MetricsRepository $metricsRepository,
        private readonly StageRulesService $stageRulesService,
        private readonly ProspectSeederService $prospectSeederService,
        private readonly UserRepository $userRepository,
    ) {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listProspects(int $userId): array
    {
        return $this->prospectRepository->listByUserId($userId);
    }

    /**
     * @return array<string, mixed>
     */
    public function getProspect(int $userId, int $prospectId): array
    {
        return $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function addNote(int $userId, int $prospectId, array $payload): array
    {
        $body = trim((string) ($payload['body'] ?? ''));
        $nextStep = trim((string) ($payload['nextStep'] ?? ''));
        $outcome = trim((string) ($payload['outcome'] ?? '')) ?: 'Captured';
        $playbookId = trim((string) ($payload['playbookId'] ?? ''));

        if ($body === '') {
            throw new ApiException('validation_failed', 'A note body is required.', 422, [
                'body' => 'Note body is required.',
            ]);
        }

        return $this->transaction(function () use ($userId, $prospectId, $body, $nextStep, $outcome, $playbookId): array {
            $prospect = $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
            $user = $this->requireUser($userId);
            $timestamp = $this->nowIso();

            $this->prospectRepository->insertNote($prospectId, $userId, $body, $this->toSqlDatetime($timestamp));
            $this->prospectRepository->insertActivity($prospectId, [
                'type' => 'note-added',
                'channel' => 'internal',
                'ownerName' => $prospect['owner'] !== '' ? $prospect['owner'] : $user['display_name'],
                'outcome' => $outcome,
                'summary' => $body,
                'nextStep' => $nextStep !== '' ? $nextStep : ($prospect['recommendedNextAction'] ?: 'Next step not captured'),
                'crmUpdated' => false,
                'createdAt' => $this->toSqlDatetime($timestamp),
            ]);

            $updates = [];
            if ($nextStep !== '') {
                $updates['recommended_next_action'] = $nextStep;
            }
            if ($playbookId !== '') {
                $matches = $prospect['playbookMatches'];
                if (!in_array($playbookId, $matches, true)) {
                    $matches[] = $playbookId;
                    $updates['playbook_matches'] = $matches;
                }
            }
            if ($updates !== []) {
                $this->prospectRepository->updateProspectFields($prospectId, $userId, $updates);
            }

            return $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
        });
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function logActivity(int $userId, int $prospectId, array $payload): array
    {
        $type = trim((string) ($payload['type'] ?? ''));
        $summary = trim((string) ($payload['summary'] ?? ''));
        $outcome = trim((string) ($payload['outcome'] ?? ''));
        $nextStep = trim((string) ($payload['nextStep'] ?? ''));
        $nextTouchDueAt = trim((string) ($payload['nextTouchDueAt'] ?? ''));
        $crmUpdated = (bool) ($payload['crmUpdated'] ?? true);

        if (!in_array($type, [
            'outbound-email',
            'call-attempt',
            'linkedin-touch',
            'reply-received',
            'meeting-booked',
            'enrichment-update',
            'ownership-changed',
            'note-added',
            'ai-draft-used',
        ], true)) {
            throw new ApiException('validation_failed', 'Unsupported activity type.', 422, [
                'type' => 'Unsupported activity type.',
            ]);
        }

        if ($summary === '') {
            throw new ApiException('validation_failed', 'Activity summary is required.', 422, [
                'summary' => 'Activity summary is required.',
            ]);
        }

        return $this->transaction(function () use (
            $userId,
            $prospectId,
            $type,
            $summary,
            $outcome,
            $nextStep,
            $nextTouchDueAt,
            $crmUpdated,
        ): array {
            $prospect = $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
            $user = $this->requireUser($userId);
            $timestamp = $this->nowIso();
            $normalizedNextTouch = $nextTouchDueAt !== '' ? $this->toSqlDatetime($nextTouchDueAt) : null;

            $this->prospectRepository->insertActivity($prospectId, [
                'type' => $type,
                'channel' => $this->channelForType($type),
                'ownerName' => $prospect['owner'] !== '' ? $prospect['owner'] : $user['display_name'],
                'outcome' => $outcome !== '' ? $outcome : $this->defaultOutcomeForType($type),
                'summary' => $summary,
                'nextStep' => $nextStep !== '' ? $nextStep : 'Next step not captured',
                'crmUpdated' => $crmUpdated,
                'createdAt' => $this->toSqlDatetime($timestamp),
            ]);

            $updates = [];
            if ($this->shouldAdvanceLastTouch($type)) {
                $updates['last_touch_at'] = $this->toSqlDatetime($timestamp);
            }
            if ($normalizedNextTouch !== null) {
                $updates['next_touch_due_at'] = $normalizedNextTouch;
            }
            if ($nextStep !== '') {
                $updates['recommended_next_action'] = $nextStep;
            }
            if ($updates !== []) {
                $this->prospectRepository->updateProspectFields($prospectId, $userId, $updates);
            }

            $this->syncCrmCompleteness($userId, $prospectId);
            return $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
        });
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createCadenceTask(int $userId, int $prospectId, array $payload): array
    {
        $stepName = trim((string) ($payload['stepName'] ?? ''));
        $channel = trim((string) ($payload['channel'] ?? ''));
        $dueAt = trim((string) ($payload['dueAt'] ?? ''));

        $fieldErrors = [];
        if ($stepName === '') {
            $fieldErrors['stepName'] = 'Step name is required.';
        }
        if ($channel === '') {
            $fieldErrors['channel'] = 'Channel is required.';
        }
        if ($dueAt === '') {
            $fieldErrors['dueAt'] = 'Due date is required.';
        }
        if ($fieldErrors !== []) {
            throw new ApiException('validation_failed', 'Cadence task is incomplete.', 422, $fieldErrors);
        }

        return $this->transaction(function () use ($userId, $prospectId, $stepName, $channel, $dueAt): array {
            $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
            $this->prospectRepository->insertCadenceTask(
                $prospectId,
                $stepName,
                $channel,
                $this->toSqlDatetime($dueAt),
            );
            $earliestDueAt = $this->prospectRepository->getEarliestOpenCadenceDueAt($prospectId);
            $this->prospectRepository->updateProspectFields($prospectId, $userId, [
                'next_touch_due_at' => $earliestDueAt !== null ? $this->toSqlDatetime($earliestDueAt) : null,
            ]);
            $this->syncCrmCompleteness($userId, $prospectId);

            return $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
        });
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateCadenceTask(int $userId, int $taskId, array $payload): array
    {
        $fields = [];

        if (array_key_exists('status', $payload)) {
            $status = trim((string) ($payload['status'] ?? ''));
            if (!in_array($status, ['open', 'completed', 'skipped'], true)) {
                throw new ApiException('validation_failed', 'Cadence task status is invalid.', 422, [
                    'status' => 'Use open, completed, or skipped.',
                ]);
            }

            $fields['status'] = $status;
            $fields['completed_at'] = $status === 'completed'
                ? $this->toSqlDatetime(trim((string) ($payload['completedAt'] ?? $this->nowIso())))
                : null;
        }

        if (array_key_exists('dueAt', $payload)) {
            $fields['due_at'] = $this->toSqlDatetime(trim((string) $payload['dueAt']));
        }

        return $this->transaction(function () use ($userId, $taskId, $fields): array {
            $prospectId = $this->prospectRepository->updateCadenceTask($taskId, $userId, $fields);
            $earliestDueAt = $this->prospectRepository->getEarliestOpenCadenceDueAt($prospectId);
            $this->prospectRepository->updateProspectFields($prospectId, $userId, [
                'next_touch_due_at' => $earliestDueAt !== null ? $this->toSqlDatetime($earliestDueAt) : null,
            ]);
            $this->syncCrmCompleteness($userId, $prospectId);

            return $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
        });
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function transitionStage(int $userId, int $prospectId, array $payload): array
    {
        $toStage = trim((string) ($payload['toStage'] ?? ''));
        if (!in_array($toStage, ['New lead', 'Active', 'Meeting booked', 'Handoff ready', 'Nurture', 'Disqualified'], true)) {
            throw new ApiException('validation_failed', 'Unsupported stage selection.', 422, [
                'toStage' => 'Unsupported stage selection.',
            ]);
        }

        return $this->transaction(function () use ($userId, $prospectId, $toStage): array {
            $prospect = $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
            $gate = $this->stageRulesService->canMoveToStage($prospect, $prospect['activities'], $toStage);
            if (!$gate['allowed']) {
                throw new ApiException('stage_gate_failed', $gate['message'], 422);
            }

            $timestamp = $this->nowIso();
            $fromStage = $prospect['stage'];

            $this->prospectRepository->updateProspectFields($prospectId, $userId, [
                'stage' => $toStage,
                'stage_entered_at' => $this->toSqlDatetime($timestamp),
            ]);
            $this->prospectRepository->insertStageHistory(
                $prospectId,
                $fromStage,
                $toStage,
                $userId,
                $this->toSqlDatetime($timestamp),
            );
            $this->prospectRepository->insertActivity($prospectId, [
                'type' => 'stage-changed',
                'channel' => 'crm',
                'ownerName' => $prospect['owner'] !== '' ? $prospect['owner'] : $this->requireUser($userId)['display_name'],
                'outcome' => sprintf('Moved to %s', $toStage),
                'summary' => sprintf('Stage moved to %s.', $toStage),
                'nextStep' => $prospect['nextTouchDueAt'] !== ''
                    ? sprintf('Next touch remains scheduled for %s.', (new \DateTimeImmutable($prospect['nextTouchDueAt']))->format('Y-m-d H:i'))
                    : 'Next step should be reviewed.',
                'crmUpdated' => true,
                'createdAt' => $this->toSqlDatetime($timestamp),
            ]);

            $this->syncCrmCompleteness($userId, $prospectId);
            return $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
        });
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateReview(int $userId, int $prospectId, array $payload): array
    {
        $allowed = [
            'deduplication' => 'review_deduplication',
            'stageCriteria' => 'review_stage_criteria',
            'nextStepPlan' => 'review_next_step_plan',
            'handoffNotes' => 'review_handoff_notes',
            'playbookStatus' => 'review_playbook_status',
        ];

        $updates = [];
        foreach ($allowed as $inputKey => $column) {
            if (array_key_exists($inputKey, $payload)) {
                $updates[$column] = trim((string) $payload[$inputKey]);
            }
        }

        return $this->transaction(function () use ($userId, $prospectId, $updates): array {
            $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
            $this->prospectRepository->updateProspectFields($prospectId, $userId, $updates);
            return $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
        });
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateOwnership(int $userId, int $prospectId, array $payload): array
    {
        $prospect = $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
        $updates = [];

        if (array_key_exists('owner', $payload)) {
            $updates['owner_name'] = trim((string) $payload['owner']);
        }
        if (array_key_exists('buyerPersona', $payload)) {
            $updates['buyer_persona'] = trim((string) $payload['buyerPersona']);
        }
        if (array_key_exists('nextTouchDueAt', $payload)) {
            $nextTouchDueAt = trim((string) ($payload['nextTouchDueAt'] ?? ''));
            $updates['next_touch_due_at'] = $nextTouchDueAt !== '' ? $this->toSqlDatetime($nextTouchDueAt) : null;
        }
        if (array_key_exists('disqualificationReason', $payload)) {
            $updates['disqualification_reason'] = trim((string) $payload['disqualificationReason']);
        }

        return $this->transaction(function () use ($userId, $prospectId, $prospect, $updates): array {
            $this->prospectRepository->updateProspectFields($prospectId, $userId, $updates);

            if (array_key_exists('owner_name', $updates) && $updates['owner_name'] !== $prospect['owner']) {
                $this->prospectRepository->insertActivity($prospectId, [
                    'type' => 'ownership-changed',
                    'channel' => 'crm',
                    'ownerName' => $updates['owner_name'],
                    'outcome' => 'Reassigned',
                    'summary' => sprintf('Ownership changed from %s to %s.', $prospect['owner'] ?: 'Unassigned', $updates['owner_name'] ?: 'Unassigned'),
                    'nextStep' => $prospect['recommendedNextAction'] ?: 'Review the next best action after reassignment.',
                    'crmUpdated' => true,
                    'createdAt' => $this->toSqlDatetime($this->nowIso()),
                ]);
            }

            $this->syncCrmCompleteness($userId, $prospectId);
            return $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
        });
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateAiFields(int $userId, int $prospectId, array $payload): array
    {
        $kind = trim((string) ($payload['kind'] ?? ''));
        $body = trim((string) ($payload['body'] ?? ''));

        if (!in_array($kind, ['summary', 'next-step', 'draft'], true) || $body === '') {
            throw new ApiException('validation_failed', 'AI apply request is incomplete.', 422, [
                'kind' => 'Use summary, next-step, or draft.',
                'body' => 'AI content is required.',
            ]);
        }

        return $this->transaction(function () use ($userId, $prospectId, $kind, $body): array {
            $prospect = $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
            $timestamp = $this->nowIso();
            $updates = [];
            $outcome = 'Applied';
            $summary = 'Applied AI content.';
            $nextStep = $prospect['recommendedNextAction'] ?: 'Review the AI-assisted recommendation.';
            $crmUpdated = false;

            if ($kind === 'summary') {
                $updates['ai_summary'] = $body;
                $outcome = 'Summary applied';
                $summary = 'Applied AI account summary to the record.';
                $crmUpdated = true;
            }

            if ($kind === 'next-step') {
                $updates['recommended_next_action'] = $body;
                $outcome = 'Next step applied';
                $summary = 'Applied AI next-best-action guidance to the record.';
                $nextStep = $body;
                $crmUpdated = true;
            }

            if ($kind === 'draft') {
                $outcome = 'Draft applied';
                $summary = 'Applied AI follow-up draft to the activity composer.';
            }

            if ($updates !== []) {
                $this->prospectRepository->updateProspectFields($prospectId, $userId, $updates);
            }

            $this->prospectRepository->insertActivity($prospectId, [
                'type' => 'ai-draft-used',
                'channel' => 'internal',
                'ownerName' => $prospect['owner'] !== '' ? $prospect['owner'] : $this->requireUser($userId)['display_name'],
                'outcome' => $outcome,
                'summary' => $summary,
                'nextStep' => $nextStep,
                'crmUpdated' => $crmUpdated,
                'createdAt' => $this->toSqlDatetime($timestamp),
            ]);

            return $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function metrics(int $userId, string $range): array
    {
        $days = $range === '7d' ? 7 : 30;
        return $this->metricsRepository->getSnapshot($userId, $days);
    }

    /**
     * @return array<string, mixed>
     */
    public function resetDemo(int $userId): array
    {
        $this->prospectSeederService->resetForUser($userId);
        return [
            'records' => $this->prospectRepository->listByUserId($userId),
        ];
    }

    /**
     * @template T
     * @param callable(): T $callback
     * @return T
     */
    private function transaction(callable $callback): mixed
    {
        $this->db->beginTransaction();
        try {
            $result = $callback();
            $this->db->commit();
            return $result;
        } catch (\Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $throwable;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function requireUser(int $userId): array
    {
        $user = $this->userRepository->findById($userId);
        if ($user === null) {
            throw new ApiException('auth_required', 'You must be signed in to access HostDesk.', 401);
        }

        return $user;
    }

    private function syncCrmCompleteness(int $userId, int $prospectId): void
    {
        $prospect = $this->prospectRepository->getDetailByIdForUser($prospectId, $userId);
        $next = $this->computeCrmCompleteness($prospect);
        if ($next !== $prospect['crmCompleteness']) {
            $this->prospectRepository->updateProspectFields($prospectId, $userId, [
                'crm_completeness' => $next,
            ]);
        }
    }

    /**
     * @param array<string, mixed> $prospect
     */
    private function computeCrmCompleteness(array $prospect): int
    {
        $values = [
            $prospect['company'] ?? '',
            $prospect['segment'] ?? '',
            $prospect['employeeRange'] ?? '',
            $prospect['microsoftFootprint'] ?? [],
            $prospect['useCase'] ?? '',
            $prospect['buyerPersona'] ?? '',
            $prospect['leadSource'] ?? '',
            $prospect['owner'] ?? '',
            $prospect['painPoints'] ?? [],
            $prospect['buyingSignals'] ?? [],
            $prospect['nextTouchDueAt'] ?? '',
            ($prospect['stage'] ?? '') === 'Disqualified' ? ($prospect['disqualificationReason'] ?? '') : 'n/a',
        ];

        $completed = 0;
        foreach ($values as $value) {
            if (is_array($value) && count($value) > 0) {
                $completed++;
            }

            if (is_string($value) && trim($value) !== '') {
                $completed++;
            }
        }

        return (int) round($completed / 12 * 100);
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);
    }

    private function channelForType(string $type): string
    {
        return match ($type) {
            'outbound-email', 'reply-received' => 'email',
            'call-attempt' => 'call',
            'linkedin-touch' => 'linkedin',
            'meeting-booked' => 'meeting',
            'enrichment-update', 'ownership-changed' => 'crm',
            default => 'internal',
        };
    }

    private function defaultOutcomeForType(string $type): string
    {
        return match ($type) {
            'outbound-email' => 'Delivered',
            'call-attempt' => 'Completed',
            'linkedin-touch' => 'Sent',
            'reply-received' => 'Received',
            'meeting-booked' => 'Confirmed',
            'enrichment-update' => 'Updated',
            'ownership-changed' => 'Reassigned',
            'ai-draft-used' => 'Applied',
            default => 'Captured',
        };
    }

    private function shouldAdvanceLastTouch(string $type): bool
    {
        return in_array($type, [
            'outbound-email',
            'call-attempt',
            'linkedin-touch',
            'reply-received',
            'meeting-booked',
            'note-added',
        ], true);
    }

    private function toSqlDatetime(string $value): string
    {
        return (new \DateTimeImmutable($value))->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    }
}
