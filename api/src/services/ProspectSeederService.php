<?php

declare(strict_types=1);

namespace HostDesk\Api\Services;

use HostDesk\Api\ApiException;
use PDO;

final class ProspectSeederService
{
    public function __construct(
        private readonly PDO $db,
        private readonly string $scenarioCatalogPath,
    ) {
    }

    public function resetForUser(int $userId): void
    {
        $scenarios = $this->loadScenarios();

        $this->db->beginTransaction();
        try {
            $delete = $this->db->prepare('DELETE FROM prospects WHERE user_id = :userId');
            $delete->execute(['userId' => $userId]);

            foreach ($scenarios as $scenario) {
                $record = $scenario['record'];
                $prospectId = $this->insertProspect($userId, $record);

                foreach ($record['activities'] ?? [] as $activity) {
                    $this->insertActivity($prospectId, $activity, $record['owner'] ?: 'HostDesk SDR');

                    if (($activity['type'] ?? '') === 'note-added') {
                        $this->insertNote($prospectId, $userId, (string) $activity['summary'], (string) $activity['timestamp']);
                    }
                }

                if (!empty($record['nextTouchDueAt'])) {
                    $this->insertCadenceTask(
                        $prospectId,
                        'Follow up on current next step',
                        $this->inferCadenceChannel($record),
                        (string) $record['nextTouchDueAt'],
                    );
                }

                $this->insertStageHistory(
                    $prospectId,
                    null,
                    (string) $record['stage'],
                    $userId,
                    (string) $record['stageEnteredAt'],
                );
            }

            $this->db->commit();
        } catch (\Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $throwable;
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function loadScenarios(): array
    {
        if (!is_file($this->scenarioCatalogPath)) {
            throw new ApiException('scenario_catalog_missing', 'The scenario catalog file is missing.', 500);
        }

        $raw = file_get_contents($this->scenarioCatalogPath);
        $decoded = json_decode((string) $raw, true);

        if (!is_array($decoded)) {
            throw new ApiException('scenario_catalog_invalid', 'The scenario catalog could not be parsed.', 500);
        }

        return $decoded;
    }

    /**
     * @param array<string, mixed> $record
     */
    private function insertProspect(int $userId, array $record): int
    {
        $statement = $this->db->prepare(
            'INSERT INTO prospects (
                user_id,
                external_key,
                subject,
                company,
                segment,
                employee_range,
                microsoft_footprint,
                use_case,
                buyer_persona,
                lead_source,
                owner_name,
                stage,
                stage_entered_at,
                created_at,
                last_touch_at,
                next_touch_due_at,
                pain_points,
                objections,
                buying_signals,
                ai_summary,
                recommended_next_action,
                crm_completeness,
                disqualification_reason,
                playbook_matches,
                review_deduplication,
                review_stage_criteria,
                review_next_step_plan,
                review_handoff_notes,
                review_playbook_status
             ) VALUES (
                :userId,
                :externalKey,
                :subject,
                :company,
                :segment,
                :employeeRange,
                :microsoftFootprint,
                :useCase,
                :buyerPersona,
                :leadSource,
                :ownerName,
                :stage,
                :stageEnteredAt,
                :createdAt,
                :lastTouchAt,
                :nextTouchDueAt,
                :painPoints,
                :objections,
                :buyingSignals,
                :aiSummary,
                :recommendedNextAction,
                :crmCompleteness,
                :disqualificationReason,
                :playbookMatches,
                :reviewDeduplication,
                :reviewStageCriteria,
                :reviewNextStepPlan,
                :reviewHandoffNotes,
                :reviewPlaybookStatus
             )',
        );

        $statement->execute([
            'userId' => $userId,
            'externalKey' => $record['id'],
            'subject' => $record['subject'],
            'company' => $record['company'],
            'segment' => $record['segment'],
            'employeeRange' => $record['employeeRange'],
            'microsoftFootprint' => json_encode($record['microsoftFootprint'] ?? []),
            'useCase' => $record['useCase'],
            'buyerPersona' => $record['buyerPersona'],
            'leadSource' => $record['leadSource'],
            'ownerName' => $record['owner'],
            'stage' => $record['stage'],
            'stageEnteredAt' => $this->toSqlDatetime((string) $record['stageEnteredAt']),
            'createdAt' => $this->toSqlDatetime((string) $record['createdAt']),
            'lastTouchAt' => $record['lastTouchAt'] !== '' ? $this->toSqlDatetime((string) $record['lastTouchAt']) : null,
            'nextTouchDueAt' => $record['nextTouchDueAt'] !== '' ? $this->toSqlDatetime((string) $record['nextTouchDueAt']) : null,
            'painPoints' => json_encode($record['painPoints'] ?? []),
            'objections' => json_encode($record['objections'] ?? []),
            'buyingSignals' => json_encode($record['buyingSignals'] ?? []),
            'aiSummary' => $record['aiSummary'],
            'recommendedNextAction' => $record['recommendedNextAction'],
            'crmCompleteness' => $this->computeCrmCompleteness($record),
            'disqualificationReason' => $record['disqualificationReason'],
            'playbookMatches' => json_encode($record['playbookMatches'] ?? []),
            'reviewDeduplication' => $record['review']['deduplication'] ?? '',
            'reviewStageCriteria' => $record['review']['stageCriteria'] ?? '',
            'reviewNextStepPlan' => $record['review']['nextStepPlan'] ?? '',
            'reviewHandoffNotes' => $record['review']['handoffNotes'] ?? '',
            'reviewPlaybookStatus' => $record['review']['playbookStatus'] ?? '',
        ]);

        return (int) $this->db->lastInsertId();
    }

    /**
     * @param array<string, mixed> $activity
     */
    private function insertActivity(int $prospectId, array $activity, string $fallbackOwner): void
    {
        $statement = $this->db->prepare(
            'INSERT INTO prospect_activities (
                prospect_id,
                type,
                channel,
                owner_name,
                outcome,
                summary,
                next_step,
                crm_updated,
                created_at
             ) VALUES (
                :prospectId,
                :type,
                :channel,
                :ownerName,
                :outcome,
                :summary,
                :nextStep,
                :crmUpdated,
                :createdAt
             )',
        );
        $statement->execute([
            'prospectId' => $prospectId,
            'type' => $activity['type'],
            'channel' => $activity['channel'],
            'ownerName' => $activity['owner'] ?: $fallbackOwner,
            'outcome' => $activity['outcome'],
            'summary' => $activity['summary'],
            'nextStep' => $activity['nextStep'],
            'crmUpdated' => !empty($activity['crmUpdated']) ? 1 : 0,
            'createdAt' => $this->toSqlDatetime((string) $activity['timestamp']),
        ]);
    }

    private function insertNote(int $prospectId, int $userId, string $body, string $createdAt): void
    {
        $statement = $this->db->prepare(
            'INSERT INTO prospect_notes (prospect_id, author_user_id, body, created_at)
             VALUES (:prospectId, :authorUserId, :body, :createdAt)',
        );
        $statement->execute([
            'prospectId' => $prospectId,
            'authorUserId' => $userId,
            'body' => $body,
            'createdAt' => $this->toSqlDatetime($createdAt),
        ]);
    }

    private function insertCadenceTask(int $prospectId, string $stepName, string $channel, string $dueAt): void
    {
        $statement = $this->db->prepare(
            'INSERT INTO cadence_tasks (prospect_id, step_name, channel, due_at, status)
             VALUES (:prospectId, :stepName, :channel, :dueAt, :status)',
        );
        $statement->execute([
            'prospectId' => $prospectId,
            'stepName' => $stepName,
            'channel' => $channel,
            'dueAt' => $this->toSqlDatetime($dueAt),
            'status' => 'open',
        ]);
    }

    private function insertStageHistory(int $prospectId, ?string $fromStage, string $toStage, int $userId, string $changedAt): void
    {
        $statement = $this->db->prepare(
            'INSERT INTO prospect_stage_history (prospect_id, from_stage, to_stage, changed_by_user_id, changed_at)
             VALUES (:prospectId, :fromStage, :toStage, :userId, :changedAt)',
        );
        $statement->execute([
            'prospectId' => $prospectId,
            'fromStage' => $fromStage,
            'toStage' => $toStage,
            'userId' => $userId,
            'changedAt' => $this->toSqlDatetime($changedAt),
        ]);
    }

    /**
     * @param array<string, mixed> $record
     */
    private function computeCrmCompleteness(array $record): int
    {
        $values = [
            $record['company'] ?? '',
            $record['segment'] ?? '',
            $record['employeeRange'] ?? '',
            $record['microsoftFootprint'] ?? [],
            $record['useCase'] ?? '',
            $record['buyerPersona'] ?? '',
            $record['leadSource'] ?? '',
            $record['owner'] ?? '',
            $record['painPoints'] ?? [],
            $record['buyingSignals'] ?? [],
            $record['nextTouchDueAt'] ?? '',
            ($record['stage'] ?? '') === 'Disqualified' ? ($record['disqualificationReason'] ?? '') : 'n/a',
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

    /**
     * @param array<string, mixed> $record
     */
    private function inferCadenceChannel(array $record): string
    {
        $firstActivity = $record['activities'][0]['channel'] ?? null;
        return is_string($firstActivity) && $firstActivity !== '' ? $firstActivity : 'email';
    }

    private function toSqlDatetime(string $value): string
    {
        return (new \DateTimeImmutable($value))->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    }
}
