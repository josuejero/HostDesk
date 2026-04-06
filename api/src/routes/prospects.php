<?php

declare(strict_types=1);

use HostDesk\Api\Auth;
use HostDesk\Api\Request;

return [
    [
        'method' => 'GET',
        'pattern' => '#^/api/prospects$#',
        'handler' => static function (array $app): array {
            $userId = Auth::requireUserId();
            return [
                'prospects' => $app['prospectService']->listProspects($userId),
            ];
        },
    ],
    [
        'method' => 'GET',
        'pattern' => '#^/api/prospects/(?P<id>\d+)$#',
        'handler' => static function (array $app, array $params): array {
            $userId = Auth::requireUserId();
            return $app['prospectService']->getProspect($userId, (int) $params['id']);
        },
    ],
    [
        'method' => 'POST',
        'pattern' => '#^/api/prospects/(?P<id>\d+)/notes$#',
        'handler' => static function (array $app, array $params): array {
            $userId = Auth::requireUserId();
            Auth::requireCsrf();
            return $app['prospectService']->addNote($userId, (int) $params['id'], Request::jsonBody());
        },
    ],
    [
        'method' => 'POST',
        'pattern' => '#^/api/prospects/(?P<id>\d+)/activities$#',
        'handler' => static function (array $app, array $params): array {
            $userId = Auth::requireUserId();
            Auth::requireCsrf();
            return $app['prospectService']->logActivity($userId, (int) $params['id'], Request::jsonBody());
        },
    ],
    [
        'method' => 'POST',
        'pattern' => '#^/api/prospects/(?P<id>\d+)/cadence-tasks$#',
        'handler' => static function (array $app, array $params): array {
            $userId = Auth::requireUserId();
            Auth::requireCsrf();
            return $app['prospectService']->createCadenceTask($userId, (int) $params['id'], Request::jsonBody());
        },
    ],
    [
        'method' => 'PATCH',
        'pattern' => '#^/api/cadence-tasks/(?P<id>\d+)$#',
        'handler' => static function (array $app, array $params): array {
            $userId = Auth::requireUserId();
            Auth::requireCsrf();
            return $app['prospectService']->updateCadenceTask($userId, (int) $params['id'], Request::jsonBody());
        },
    ],
    [
        'method' => 'POST',
        'pattern' => '#^/api/prospects/(?P<id>\d+)/stage-transitions$#',
        'handler' => static function (array $app, array $params): array {
            $userId = Auth::requireUserId();
            Auth::requireCsrf();
            return $app['prospectService']->transitionStage($userId, (int) $params['id'], Request::jsonBody());
        },
    ],
    [
        'method' => 'PATCH',
        'pattern' => '#^/api/prospects/(?P<id>\d+)/review$#',
        'handler' => static function (array $app, array $params): array {
            $userId = Auth::requireUserId();
            Auth::requireCsrf();
            return $app['prospectService']->updateReview($userId, (int) $params['id'], Request::jsonBody());
        },
    ],
    [
        'method' => 'PATCH',
        'pattern' => '#^/api/prospects/(?P<id>\d+)/ownership$#',
        'handler' => static function (array $app, array $params): array {
            $userId = Auth::requireUserId();
            Auth::requireCsrf();
            return $app['prospectService']->updateOwnership($userId, (int) $params['id'], Request::jsonBody());
        },
    ],
    [
        'method' => 'PATCH',
        'pattern' => '#^/api/prospects/(?P<id>\d+)/ai-fields$#',
        'handler' => static function (array $app, array $params): array {
            $userId = Auth::requireUserId();
            Auth::requireCsrf();
            return $app['prospectService']->updateAiFields($userId, (int) $params['id'], Request::jsonBody());
        },
    ],
    [
        'method' => 'POST',
        'pattern' => '#^/api/demo/reset$#',
        'handler' => static function (array $app): array {
            $userId = Auth::requireUserId();
            Auth::requireCsrf();
            return $app['prospectService']->resetDemo($userId);
        },
    ],
];
