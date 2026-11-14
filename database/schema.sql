-- AstroKids Academy: MySQL 8 schema (generated from the SQLAlchemy models; the app can also create this itself).
-- Usage: mysql -u root -p < database/create_database.sql   then   mysql -u astrokids -p astrokids < database/schema.sql
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE badges (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	code VARCHAR(40) NOT NULL, 
	name VARCHAR(60) NOT NULL, 
	description VARCHAR(255) NOT NULL, 
	how_to_earn VARCHAR(255) NOT NULL, 
	icon VARCHAR(30) NOT NULL, 
	color VARCHAR(20) NOT NULL, 
	xp_bonus INTEGER NOT NULL, 
	order_index INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE missions (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	code VARCHAR(40) NOT NULL, 
	title VARCHAR(80) NOT NULL, 
	short_description VARCHAR(200) NOT NULL, 
	instructions JSON NOT NULL, 
	learning_goal VARCHAR(255) NOT NULL, 
	xp_reward INTEGER NOT NULL, 
	difficulty VARCHAR(20) NOT NULL, 
	order_index INTEGER NOT NULL, 
	color VARCHAR(20) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE parents (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	display_name VARCHAR(60) NOT NULL, 
	token_version INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	last_login_at DATETIME, 
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE UNIQUE INDEX ix_parents_email ON parents (email);

CREATE TABLE planets (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	slug VARCHAR(30) NOT NULL, 
	name VARCHAR(40) NOT NULL, 
	kind VARCHAR(20) NOT NULL, 
	order_index INTEGER NOT NULL, 
	tagline VARCHAR(120) NOT NULL, 
	description TEXT NOT NULL, 
	fun_facts JSON NOT NULL, 
	distance_from_sun VARCHAR(80) NOT NULL, 
	distance_million_km FLOAT NOT NULL, 
	temperature VARCHAR(80) NOT NULL, 
	diameter_km INTEGER NOT NULL, 
	size_comparison VARCHAR(120) NOT NULL, 
	moons INTEGER, 
	day_length VARCHAR(60) NOT NULL, 
	year_length VARCHAR(60) NOT NULL, 
	color VARCHAR(20) NOT NULL, 
	xp_reward INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quizzes (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	slug VARCHAR(40) NOT NULL, 
	title VARCHAR(80) NOT NULL, 
	description VARCHAR(255) NOT NULL, 
	xp_per_correct INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE children (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	parent_id INTEGER NOT NULL, 
	nickname VARCHAR(30) NOT NULL, 
	age_group VARCHAR(10) NOT NULL, 
	ai_enabled BOOL NOT NULL, 
	ai_live_allowed BOOL NOT NULL, 
	ai_daily_limit INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_child_parent_nickname UNIQUE (parent_id, nickname), 
	FOREIGN KEY(parent_id) REFERENCES parents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_children_parent_id ON children (parent_id);

CREATE TABLE quiz_questions (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	quiz_id INTEGER NOT NULL, 
	order_index INTEGER NOT NULL, 
	question VARCHAR(255) NOT NULL, 
	options JSON NOT NULL, 
	correct_index INTEGER NOT NULL, 
	explanation VARCHAR(400) NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_quiz_question_order UNIQUE (quiz_id, order_index), 
	FOREIGN KEY(quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_quiz_questions_quiz_id ON quiz_questions (quiz_id);

CREATE TABLE ai_sessions (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	child_id INTEGER NOT NULL, 
	session_date DATE NOT NULL, 
	message_count INTEGER NOT NULL, 
	demo_count INTEGER NOT NULL, 
	blocked_count INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_ai_session_day UNIQUE (child_id, session_date), 
	FOREIGN KEY(child_id) REFERENCES children (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_ai_sessions_child_id ON ai_sessions (child_id);

CREATE TABLE astronaut_profiles (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	child_id INTEGER NOT NULL, 
	suit_color VARCHAR(20) NOT NULL, 
	helmet_style VARCHAR(20) NOT NULL, 
	visor_color VARCHAR(20) NOT NULL, 
	backpack_style VARCHAR(20) NOT NULL, 
	accessory VARCHAR(20) NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (child_id), 
	FOREIGN KEY(child_id) REFERENCES children (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE certificates (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	child_id INTEGER NOT NULL, 
	certificate_code VARCHAR(24) NOT NULL, 
	level_name VARCHAR(40) NOT NULL, 
	total_xp INTEGER NOT NULL, 
	issued_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (child_id), 
	FOREIGN KEY(child_id) REFERENCES children (id) ON DELETE CASCADE, 
	UNIQUE (certificate_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE child_sessions (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	child_id INTEGER NOT NULL, 
	started_at DATETIME NOT NULL, 
	last_active_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(child_id) REFERENCES children (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_child_sessions_child_id ON child_sessions (child_id);

CREATE TABLE earned_badges (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	child_id INTEGER NOT NULL, 
	badge_id INTEGER NOT NULL, 
	earned_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_earned_badge UNIQUE (child_id, badge_id), 
	FOREIGN KEY(child_id) REFERENCES children (id) ON DELETE CASCADE, 
	FOREIGN KEY(badge_id) REFERENCES badges (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_earned_badges_child_id ON earned_badges (child_id);

CREATE TABLE mission_attempts (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	child_id INTEGER NOT NULL, 
	mission_id INTEGER NOT NULL, 
	success BOOL NOT NULL, 
	score INTEGER NOT NULL, 
	xp_earned INTEGER NOT NULL, 
	details JSON NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(child_id) REFERENCES children (id) ON DELETE CASCADE, 
	FOREIGN KEY(mission_id) REFERENCES missions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_mission_attempts_child_id ON mission_attempts (child_id);
CREATE INDEX ix_mission_attempts_created_at ON mission_attempts (created_at);

CREATE TABLE mission_progress (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	child_id INTEGER NOT NULL, 
	mission_id INTEGER NOT NULL, 
	attempts INTEGER NOT NULL, 
	best_score INTEGER NOT NULL, 
	completed BOOL NOT NULL, 
	first_completed_at DATETIME, 
	xp_awarded INTEGER NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_progress_child_mission UNIQUE (child_id, mission_id), 
	CONSTRAINT ck_progress_score CHECK (best_score >= 0 AND best_score <= 100), 
	FOREIGN KEY(child_id) REFERENCES children (id) ON DELETE CASCADE, 
	FOREIGN KEY(mission_id) REFERENCES missions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_mission_progress_child_id ON mission_progress (child_id);

CREATE TABLE planet_visits (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	child_id INTEGER NOT NULL, 
	planet_id INTEGER NOT NULL, 
	visited_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_planet_visit UNIQUE (child_id, planet_id), 
	FOREIGN KEY(child_id) REFERENCES children (id) ON DELETE CASCADE, 
	FOREIGN KEY(planet_id) REFERENCES planets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_planet_visits_child_id ON planet_visits (child_id);

CREATE TABLE quiz_attempts (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	child_id INTEGER NOT NULL, 
	quiz_id INTEGER NOT NULL, 
	correct_count INTEGER NOT NULL, 
	total_questions INTEGER NOT NULL, 
	percent INTEGER NOT NULL, 
	xp_earned INTEGER NOT NULL, 
	answers JSON NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(child_id) REFERENCES children (id) ON DELETE CASCADE, 
	FOREIGN KEY(quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_quiz_attempts_child_id ON quiz_attempts (child_id);

CREATE TABLE rocket_builds (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	child_id INTEGER NOT NULL, 
	name VARCHAR(40) NOT NULL, 
	components JSON NOT NULL, 
	body_color VARCHAR(20) NOT NULL, 
	accent_color VARCHAR(20) NOT NULL, 
	is_valid BOOL NOT NULL, 
	launched BOOL NOT NULL, 
	launch_success BOOL NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(child_id) REFERENCES children (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_rocket_builds_child_id ON rocket_builds (child_id);

CREATE TABLE xp_events (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	child_id INTEGER NOT NULL, 
	source VARCHAR(20) NOT NULL, 
	source_key VARCHAR(80) NOT NULL, 
	amount INTEGER NOT NULL, 
	description VARCHAR(160) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_xp_child_source UNIQUE (child_id, source_key), 
	FOREIGN KEY(child_id) REFERENCES children (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_xp_events_child_id ON xp_events (child_id);

CREATE TABLE ai_messages (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	session_id INTEGER NOT NULL, 
	`role` VARCHAR(10) NOT NULL, 
	content VARCHAR(2000) NOT NULL, 
	mode VARCHAR(10) NOT NULL, 
	flagged BOOL NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(session_id) REFERENCES ai_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_ai_messages_session_id ON ai_messages (session_id);

SET FOREIGN_KEY_CHECKS=1;
