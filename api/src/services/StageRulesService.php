<?php

declare(strict_types=1);

namespace HostDesk\Api\Services;

final class StageRulesService
{
    public function __construct(private readonly \DateTimeZone $timezone)
    {
    }

    /**
     * @param array<string, mixed> $record
     * @param array<int, array<string, mixed>> $activities
     * @return array{allowed: bool, message: string}
     */
    public function canMoveToStage(array $record, array $activities, string $stage): array
    {
        if ($stage === 'Meeting booked') {
            if (!$this->hasOutboundActivity($activities) || !$this->hasResponseOrMeetingActivity($activities)) {
                return [
                    'allowed' => false,
                    'message' => 'Meeting booked requires outbound activity plus a reply or meeting event in the timeline.',
                ];
            }
        }

        if ($stage === 'Handoff ready') {
            $motion = $this->getMicrosoftMotion($record);
            if (
                trim((string) ($record['owner'] ?? '')) === ''
                || trim((string) ($record['buyerPersona'] ?? '')) === ''
                || trim((string) ($record['lastTouchAt'] ?? '')) === ''
                || !$this->hasDatedNextStep($record)
                || $motion === 'Mixed motion'
            ) {
                return [
                    'allowed' => false,
                    'message' => 'Handoff ready requires owner, buyer persona, Microsoft fit, last touch, and a dated next step.',
                ];
            }
        }

        if ($stage === 'Disqualified' && trim((string) ($record['disqualificationReason'] ?? '')) === '') {
            return [
                'allowed' => false,
                'message' => 'Disqualified requires a reason code before the record can leave active work.',
            ];
        }

        if ($stage === 'Active' && ($this->isRecordStale($record) || !$this->hasDatedNextStep($record))) {
            return [
                'allowed' => false,
                'message' => 'Active records must have a current next step and cannot remain stale.',
            ];
        }

        return [
            'allowed' => true,
            'message' => sprintf('%s stage is available.', $stage),
        ];
    }

    /**
     * @param array<string, mixed> $record
     */
    public function getMicrosoftMotion(array $record): string
    {
        $text = strtolower(implode(' ', array_filter([
            $record['subject'] ?? '',
            $record['company'] ?? '',
            $record['segment'] ?? '',
            $record['useCase'] ?? '',
            $record['buyerPersona'] ?? '',
            $record['leadSource'] ?? '',
            ...($record['microsoftFootprint'] ?? []),
            ...($record['painPoints'] ?? []),
            ...($record['objections'] ?? []),
            ...($record['buyingSignals'] ?? []),
        ])));

        $avdScore = $this->score($text, '/\b(avd|citrix|vdi|session host|host pool|shared desktop)\b/')
            + $this->score($text, '/\b(cost|azure spend|migration)\b/');
        $windowsScore = $this->score($text, '/\b(windows 365|cloud pc)\b/')
            + $this->score($text, '/\b(contractor|byod|personal device|seasonal)\b/');
        $intuneScore = $this->score($text, '/\b(intune)\b/')
            + $this->score($text, '/\b(compliance|policy|endpoint|patch|app deployment)\b/');

        $scores = [
            ['label' => 'Azure Virtual Desktop', 'value' => $avdScore],
            ['label' => 'Windows 365', 'value' => $windowsScore],
            ['label' => 'Intune', 'value' => $intuneScore],
        ];

        usort($scores, static fn (array $left, array $right): int => $right['value'] <=> $left['value']);

        if (($scores[0]['value'] ?? 0) === 0) {
            return 'Mixed motion';
        }

        if (($scores[0]['value'] ?? 0) === ($scores[1]['value'] ?? 0) && ($scores[1]['value'] ?? 0) > 0) {
            return 'Mixed motion';
        }

        return $scores[0]['label'];
    }

    /**
     * @param array<string, mixed> $record
     */
    public function hasDatedNextStep(array $record): bool
    {
        return trim((string) ($record['nextTouchDueAt'] ?? '')) !== '';
    }

    /**
     * @param array<string, mixed> $record
     */
    public function isRecordStale(array $record): bool
    {
        $baseline = (string) ($record['lastTouchAt'] ?: $record['createdAt'] ?? '');
        if ($baseline === '') {
            return false;
        }

        $now = new \DateTimeImmutable('now', $this->timezone);
        $baselineDate = new \DateTimeImmutable($baseline, $this->timezone);
        return (int) $baselineDate->diff($now)->format('%a') >= 14;
    }

    /**
     * @param array<int, array<string, mixed>> $activities
     */
    public function hasOutboundActivity(array $activities): bool
    {
        foreach ($activities as $activity) {
            if (in_array($activity['type'] ?? '', ['outbound-email', 'call-attempt', 'linkedin-touch'], true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<int, array<string, mixed>> $activities
     */
    public function hasResponseOrMeetingActivity(array $activities): bool
    {
        foreach ($activities as $activity) {
            if (in_array($activity['type'] ?? '', ['reply-received', 'meeting-booked'], true)) {
                return true;
            }
        }

        return false;
    }

    private function score(string $text, string $pattern): int
    {
        return preg_match($pattern, $text) === 1 ? 1 : 0;
    }
}
