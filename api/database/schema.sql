CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL
);

CREATE TABLE login_attempts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_attempts_email_time (email, attempted_at),
  INDEX idx_login_attempts_ip_time (ip_address, attempted_at)
);

CREATE TABLE prospects (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  external_key VARCHAR(64) NULL,
  subject VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  segment VARCHAR(100) NOT NULL,
  employee_range VARCHAR(100) NOT NULL,
  microsoft_footprint JSON NOT NULL,
  use_case TEXT NOT NULL,
  buyer_persona VARCHAR(255) NOT NULL,
  lead_source VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  stage ENUM('New lead','Active','Meeting booked','Handoff ready','Nurture','Disqualified') NOT NULL,
  stage_entered_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  last_touch_at DATETIME NULL,
  next_touch_due_at DATETIME NULL,
  pain_points JSON NOT NULL,
  objections JSON NOT NULL,
  buying_signals JSON NOT NULL,
  ai_summary TEXT NOT NULL,
  recommended_next_action TEXT NOT NULL,
  crm_completeness TINYINT UNSIGNED NOT NULL DEFAULT 0,
  disqualification_reason TEXT NOT NULL,
  playbook_matches JSON NOT NULL,
  review_deduplication TEXT NOT NULL,
  review_stage_criteria TEXT NOT NULL,
  review_next_step_plan TEXT NOT NULL,
  review_handoff_notes TEXT NOT NULL,
  review_playbook_status VARCHAR(30) NOT NULL DEFAULT '',
  CONSTRAINT fk_prospects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_prospects_user_stage (user_id, stage),
  INDEX idx_prospects_user_external_key (user_id, external_key),
  INDEX idx_prospects_next_touch (user_id, next_touch_due_at)
);

CREATE TABLE prospect_activities (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  prospect_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  outcome VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  next_step TEXT NOT NULL,
  crm_updated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_activities_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
  INDEX idx_activities_prospect_created (prospect_id, created_at),
  INDEX idx_activities_type_created (type, created_at)
);

CREATE TABLE prospect_notes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  prospect_id BIGINT UNSIGNED NOT NULL,
  author_user_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notes_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
  CONSTRAINT fk_notes_user FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notes_prospect_created (prospect_id, created_at)
);

CREATE TABLE cadence_tasks (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  prospect_id BIGINT UNSIGNED NOT NULL,
  step_name VARCHAR(120) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  due_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  status ENUM('open','completed','skipped') NOT NULL DEFAULT 'open',
  CONSTRAINT fk_cadence_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
  INDEX idx_cadence_prospect_status_due (prospect_id, status, due_at)
);

CREATE TABLE prospect_stage_history (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  prospect_id BIGINT UNSIGNED NOT NULL,
  from_stage VARCHAR(50) NULL,
  to_stage VARCHAR(50) NOT NULL,
  changed_by_user_id BIGINT UNSIGNED NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stage_history_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
  CONSTRAINT fk_stage_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_stage_history_prospect_time (prospect_id, changed_at)
);
