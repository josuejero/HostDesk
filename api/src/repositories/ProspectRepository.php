<?php

declare(strict_types=1);

namespace HostDesk\Api\Repositories;

use HostDesk\Api\ApiException;
use PDO;

final class ProspectRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listByUserId(int $userId): array
    {
        $statement = $this->db->prepare(
            'SELECT *
             FROM prospects
             WHERE user_id = :userId
             ORDER BY created_at DESC, id DESC',
        );
        $statement->execute(['userId' => $userId]);
        $rows = $statement->fetchAll();

        return array_map(fn (array $row): array => $this->mapProspectSummary($row), $rows);
    }

    /**
     * @return array<string, mixed>
     */
    public function getDetailByIdForUser(int $prospectId, int $userId): array
    {
        $statement = $this->db->prepare(
            'SELECT *
             FROM prospects
             WHERE id = :id AND user_id = :userId
             LIMIT 1',
        );
        $statement->execute([
            'id' => $prospectId,
            'userId' => $userId,
        ]);
        $row = $statement->fetch();

        if (!is_array($row)) {
            throw new ApiException('prospect_not_found', 'Prospect not found.', 404);
        }

        $detail = $this->mapProspectSummary($row);
        $detail['activities'] = $this->getActivities((int) $row['id']);
        $detail['notes'] = $this->getNotes((int) $row['id']);
        $detail['cadenceTasks'] = $this->getCadenceTasks((int) $row['id']);
        $detail['stageHistory'] = $this->getStageHistory((int) $row['id']);

        return $detail;
    }

    /**
     * @param array<string, mixed> $fields
     */
    public function updateProspectFields(int $prospectId, int $userId, array $fields): void
    {
        if ($fields === []) {
            return;
        }

        $assignments = [];
        $params = [
            'id' => $prospectId,
            'userId' => $userId,
        ];

        foreach ($fields as $key => $value) {
            $assignments[] = sprintf('%s = :%s', $key, $key);
            if (in_array($key, ['microsoft_footprint', 'pain_points', 'objections', 'buying_signals', 'playbook_matches'], true)) {
                $params[$key] = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                continue;
            }

            $params[$key] = $value;
        }

        $sql = sprintf(
            'UPDATE prospects SET %s WHERE id = :id AND user_id = :userId',
            implode(', ', $assignments),
        );

        $statement = $this->db->prepare($sql);
        $statement->execute($params);

        if ($statement->rowCount() === 0) {
            $this->getDetailByIdForUser($prospectId, $userId);
        }
    }

    /**
     * @param array<string, mixed> $activity
     */
    public function insertActivity(int $prospectId, array $activity): void
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
            'ownerName' => $activity['ownerName'],
            'outcome' => $activity['outcome'],
            'summary' => $activity['summary'],
            'nextStep' => $activity['nextStep'],
            'crmUpdated' => (int) $activity['crmUpdated'],
            'createdAt' => $activity['createdAt'],
        ]);
    }

    public function insertNote(int $prospectId, int $authorUserId, string $body, string $createdAt): void
    {
        $statement = $this->db->prepare(
            'INSERT INTO prospect_notes (prospect_id, author_user_id, body, created_at)
             VALUES (:prospectId, :authorUserId, :body, :createdAt)',
        );
        $statement->execute([
            'prospectId' => $prospectId,
            'authorUserId' => $authorUserId,
            'body' => $body,
            'createdAt' => $createdAt,
        ]);
    }

    public function insertCadenceTask(
        int $prospectId,
        string $stepName,
        string $channel,
        string $dueAt,
        string $status = 'open',
        ?string $completedAt = null,
    ): void {
        $statement = $this->db->prepare(
            'INSERT INTO cadence_tasks (prospect_id, step_name, channel, due_at, completed_at, status)
             VALUES (:prospectId, :stepName, :channel, :dueAt, :completedAt, :status)',
        );
        $statement->execute([
            'prospectId' => $prospectId,
            'stepName' => $stepName,
            'channel' => $channel,
            'dueAt' => $dueAt,
            'completedAt' => $completedAt,
            'status' => $status,
        ]);
    }

    /**
     * @param array<string, mixed> $fields
     */
    public function updateCadenceTask(int $taskId, int $userId, array $fields): int
    {
        $task = $this->findCadenceTaskForUser($taskId, $userId);
        if (!is_array($task)) {
            throw new ApiException('cadence_task_not_found', 'Cadence task not found.', 404);
        }

        if ($fields === []) {
            return (int) $task['prospect_id'];
        }

        $assignments = [];
        $params = ['id' => $taskId];
        foreach ($fields as $key => $value) {
            $assignments[] = sprintf('%s = :%s', $key, $key);
            $params[$key] = $value;
        }

        $sql = sprintf('UPDATE cadence_tasks SET %s WHERE id = :id', implode(', ', $assignments));
        $statement = $this->db->prepare($sql);
        $statement->execute($params);

        return (int) $task['prospect_id'];
    }

    public function insertStageHistory(
        int $prospectId,
        ?string $fromStage,
        string $toStage,
        int $changedByUserId,
        string $changedAt,
    ): void {
        $statement = $this->db->prepare(
            'INSERT INTO prospect_stage_history (prospect_id, from_stage, to_stage, changed_by_user_id, changed_at)
             VALUES (:prospectId, :fromStage, :toStage, :changedByUserId, :changedAt)',
        );
        $statement->execute([
            'prospectId' => $prospectId,
            'fromStage' => $fromStage,
            'toStage' => $toStage,
            'changedByUserId' => $changedByUserId,
            'changedAt' => $changedAt,
        ]);
    }

    public function getEarliestOpenCadenceDueAt(int $prospectId): ?string
    {
        $statement = $this->db->prepare(
            'SELECT due_at
             FROM cadence_tasks
             WHERE prospect_id = :prospectId
               AND status = :status
             ORDER BY due_at ASC
             LIMIT 1',
        );
        $statement->execute([
            'prospectId' => $prospectId,
            'status' => 'open',
        ]);
        $value = $statement->fetchColumn();

        return is_string($value) ? $this->toIso($value) : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function findCadenceTaskForUser(int $taskId, int $userId): ?array
    {
        $statement = $this->db->prepare(
            'SELECT c.id, c.prospect_id
             FROM cadence_tasks c
             INNER JOIN prospects p ON p.id = c.prospect_id
             WHERE c.id = :id AND p.user_id = :userId
             LIMIT 1',
        );
        $statement->execute([
            'id' => $taskId,
            'userId' => $userId,
        ]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getActivities(int $prospectId): array
    {
        $statement = $this->db->prepare(
            'SELECT id, type, channel, owner_name, outcome, summary, next_step, crm_updated, created_at
             FROM prospect_activities
             WHERE prospect_id = :prospectId
             ORDER BY created_at ASC, id ASC',
        );
        $statement->execute(['prospectId' => $prospectId]);
        $rows = $statement->fetchAll();

        return array_map(fn (array $row): array => [
            'id' => (string) $row['id'],
            'type' => $row['type'],
            'owner' => $row['owner_name'],
            'timestamp' => $this->toIso((string) $row['created_at']),
            'channel' => $row['channel'],
            'outcome' => $row['outcome'],
            'summary' => $row['summary'],
            'nextStep' => $row['next_step'],
            'crmUpdated' => (bool) $row['crm_updated'],
        ], $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getNotes(int $prospectId): array
    {
        $statement = $this->db->prepare(
            'SELECT n.id, n.body, n.created_at, n.author_user_id, u.display_name
             FROM prospect_notes n
             INNER JOIN users u ON u.id = n.author_user_id
             WHERE n.prospect_id = :prospectId
             ORDER BY n.created_at ASC, n.id ASC',
        );
        $statement->execute(['prospectId' => $prospectId]);
        $rows = $statement->fetchAll();

        return array_map(fn (array $row): array => [
            'id' => (string) $row['id'],
            'authorUserId' => (string) $row['author_user_id'],
            'authorName' => $row['display_name'],
            'body' => $row['body'],
            'createdAt' => $this->toIso((string) $row['created_at']),
        ], $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getCadenceTasks(int $prospectId): array
    {
        $statement = $this->db->prepare(
            'SELECT id, step_name, channel, due_at, completed_at, status
             FROM cadence_tasks
             WHERE prospect_id = :prospectId
             ORDER BY due_at ASC, id ASC',
        );
        $statement->execute(['prospectId' => $prospectId]);
        $rows = $statement->fetchAll();

        return array_map(fn (array $row): array => [
            'id' => (string) $row['id'],
            'prospectId' => (string) $prospectId,
            'stepName' => $row['step_name'],
            'channel' => $row['channel'],
            'dueAt' => $this->toIso((string) $row['due_at']),
            'completedAt' => isset($row['completed_at']) && $row['completed_at'] !== null ? $this->toIso((string) $row['completed_at']) : null,
            'status' => $row['status'],
        ], $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getStageHistory(int $prospectId): array
    {
        $statement = $this->db->prepare(
            'SELECT h.id, h.from_stage, h.to_stage, h.changed_by_user_id, h.changed_at, u.display_name
             FROM prospect_stage_history h
             INNER JOIN users u ON u.id = h.changed_by_user_id
             WHERE h.prospect_id = :prospectId
             ORDER BY h.changed_at ASC, h.id ASC',
        );
        $statement->execute(['prospectId' => $prospectId]);
        $rows = $statement->fetchAll();

        return array_map(fn (array $row): array => [
            'id' => (string) $row['id'],
            'prospectId' => (string) $prospectId,
            'fromStage' => $row['from_stage'],
            'toStage' => $row['to_stage'],
            'changedByUserId' => (string) $row['changed_by_user_id'],
            'changedByName' => $row['display_name'],
            'changedAt' => $this->toIso((string) $row['changed_at']),
        ], $rows);
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function mapProspectSummary(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'externalKey' => $row['external_key'],
            'subject' => $row['subject'],
            'company' => $row['company'],
            'segment' => $row['segment'],
            'employeeRange' => $row['employee_range'],
            'microsoftFootprint' => $this->decodeJsonList($row['microsoft_footprint'] ?? null),
            'useCase' => $row['use_case'],
            'buyerPersona' => $row['buyer_persona'],
            'leadSource' => $row['lead_source'],
            'owner' => $row['owner_name'],
            'stage' => $row['stage'],
            'stageEnteredAt' => $this->toIso((string) $row['stage_entered_at']),
            'createdAt' => $this->toIso((string) $row['created_at']),
            'lastTouchAt' => $row['last_touch_at'] !== null ? $this->toIso((string) $row['last_touch_at']) : '',
            'nextTouchDueAt' => $row['next_touch_due_at'] !== null ? $this->toIso((string) $row['next_touch_due_at']) : '',
            'painPoints' => $this->decodeJsonList($row['pain_points'] ?? null),
            'objections' => $this->decodeJsonList($row['objections'] ?? null),
            'buyingSignals' => $this->decodeJsonList($row['buying_signals'] ?? null),
            'playbookMatches' => $this->decodeJsonList($row['playbook_matches'] ?? null),
            'review' => [
                'deduplication' => $row['review_deduplication'],
                'stageCriteria' => $row['review_stage_criteria'],
                'nextStepPlan' => $row['review_next_step_plan'],
                'handoffNotes' => $row['review_handoff_notes'],
                'playbookStatus' => $row['review_playbook_status'],
            ],
            'aiSummary' => $row['ai_summary'],
            'recommendedNextAction' => $row['recommended_next_action'],
            'crmCompleteness' => (int) $row['crm_completeness'],
            'disqualificationReason' => $row['disqualification_reason'],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function decodeJsonList(?string $json): array
    {
        if (!is_string($json) || trim($json) === '') {
            return [];
        }

        $decoded = json_decode($json, true);
        if (!is_array($decoded)) {
            return [];
        }

        return array_values(array_map(
            static fn (mixed $value): string => is_string($value) ? $value : (string) $value,
            array_filter($decoded, static fn (mixed $value): bool => is_string($value) || is_numeric($value)),
        ));
    }

    private function toIso(string $value): string
    {
        return (new \DateTimeImmutable($value, new \DateTimeZone('UTC')))->format(DATE_ATOM);
    }
}
