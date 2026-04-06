<?php

declare(strict_types=1);

namespace HostDesk\Api\Repositories;

use PDO;

final class MetricsRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function getSnapshot(int $userId, int $days): array
    {
        $cutoff = (new \DateTimeImmutable(sprintf('-%d days', $days), new \DateTimeZone('UTC')))->format('Y-m-d H:i:s');
        $todayStart = (new \DateTimeImmutable('today', new \DateTimeZone('UTC')))->format('Y-m-d 00:00:00');
        $tomorrowStart = (new \DateTimeImmutable('tomorrow', new \DateTimeZone('UTC')))->format('Y-m-d 00:00:00');

        return [
            'range' => sprintf('%dd', $days),
            'responseRatePct' => $this->responseRate($userId, $cutoff),
            'stageConversions' => $this->stageConversions($userId),
            'overdueFollowups' => $this->overdueFollowups($userId),
            'tasksDueToday' => $this->tasksDueToday($userId, $todayStart, $tomorrowStart),
            'meetingsBooked' => $this->meetingsBooked($userId, $cutoff),
            'overdueItems' => $this->overdueItems($userId),
        ];
    }

    private function responseRate(int $userId, string $cutoff): float
    {
        $statement = $this->db->prepare(
            'SELECT
                ROUND(
                    100.0 * COUNT(DISTINCT CASE WHEN a.type = :replyType THEN a.prospect_id END)
                    / NULLIF(COUNT(DISTINCT CASE WHEN a.type IN (:emailType, :callType, :linkedinType) THEN a.prospect_id END), 0),
                    1
                ) AS response_rate_pct
             FROM prospect_activities a
             INNER JOIN prospects p ON p.id = a.prospect_id
             WHERE p.user_id = :userId
               AND a.created_at >= :cutoff',
        );
        $statement->execute([
            'replyType' => 'reply-received',
            'emailType' => 'outbound-email',
            'callType' => 'call-attempt',
            'linkedinType' => 'linkedin-touch',
            'userId' => $userId,
            'cutoff' => $cutoff,
        ]);

        return (float) ($statement->fetchColumn() ?: 0.0);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function stageConversions(int $userId): array
    {
        $statement = $this->db->prepare(
            'SELECT
                s.from_stage,
                s.to_stage,
                s.converted,
                ROUND(100.0 * s.converted / NULLIF(b.base_count, 0), 1) AS conversion_pct
             FROM (
                SELECT h.from_stage, h.to_stage, COUNT(DISTINCT h.prospect_id) AS converted
                FROM prospect_stage_history h
                INNER JOIN prospects p1 ON p1.id = h.prospect_id
                WHERE p1.user_id = :historyUserId
                GROUP BY h.from_stage, h.to_stage
             ) s
             LEFT JOIN (
                 SELECT stage AS from_stage, COUNT(*) AS base_count
                 FROM prospects
                 WHERE user_id = :baseUserId
                 GROUP BY stage
              ) b ON b.from_stage = s.from_stage
              ORDER BY s.converted DESC, s.to_stage ASC',
         );
        $statement->execute([
            'historyUserId' => $userId,
            'baseUserId' => $userId,
        ]);
        $rows = $statement->fetchAll();

        return array_map(static fn (array $row): array => [
            'fromStage' => $row['from_stage'],
            'toStage' => $row['to_stage'],
            'convertedProspects' => (int) $row['converted'],
            'conversionPct' => $row['conversion_pct'] !== null ? (float) $row['conversion_pct'] : null,
        ], $rows);
    }

    private function overdueFollowups(int $userId): int
    {
        $statement = $this->db->prepare(
            'SELECT COUNT(*)
             FROM cadence_tasks c
             INNER JOIN prospects p ON p.id = c.prospect_id
             WHERE p.user_id = :userId
               AND c.status = :status
               AND c.due_at < UTC_TIMESTAMP()',
        );
        $statement->execute([
            'userId' => $userId,
            'status' => 'open',
        ]);

        return (int) ($statement->fetchColumn() ?: 0);
    }

    private function tasksDueToday(int $userId, string $todayStart, string $tomorrowStart): int
    {
        $statement = $this->db->prepare(
            'SELECT COUNT(*)
             FROM cadence_tasks c
             INNER JOIN prospects p ON p.id = c.prospect_id
             WHERE p.user_id = :userId
               AND c.status = :status
               AND c.due_at >= :todayStart
               AND c.due_at < :tomorrowStart',
        );
        $statement->execute([
            'userId' => $userId,
            'status' => 'open',
            'todayStart' => $todayStart,
            'tomorrowStart' => $tomorrowStart,
        ]);

        return (int) ($statement->fetchColumn() ?: 0);
    }

    private function meetingsBooked(int $userId, string $cutoff): int
    {
        $statement = $this->db->prepare(
            'SELECT COUNT(DISTINCT a.prospect_id)
             FROM prospect_activities a
             INNER JOIN prospects p ON p.id = a.prospect_id
             WHERE p.user_id = :userId
               AND a.type = :meetingType
               AND a.created_at >= :cutoff',
        );
        $statement->execute([
            'userId' => $userId,
            'meetingType' => 'meeting-booked',
            'cutoff' => $cutoff,
        ]);

        return (int) ($statement->fetchColumn() ?: 0);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function overdueItems(int $userId): array
    {
        $statement = $this->db->prepare(
            'SELECT p.company, p.owner_name, c.step_name, c.due_at
             FROM cadence_tasks c
             INNER JOIN prospects p ON p.id = c.prospect_id
             WHERE p.user_id = :userId
               AND c.status = :status
               AND c.due_at < UTC_TIMESTAMP()
             ORDER BY c.due_at ASC
             LIMIT 25',
        );
        $statement->execute([
            'userId' => $userId,
            'status' => 'open',
        ]);
        $rows = $statement->fetchAll();

        return array_map(static fn (array $row): array => [
            'company' => $row['company'],
            'owner' => $row['owner_name'],
            'stepName' => $row['step_name'],
            'dueAt' => (new \DateTimeImmutable($row['due_at'], new \DateTimeZone('UTC')))->format(DATE_ATOM),
        ], $rows);
    }
}
