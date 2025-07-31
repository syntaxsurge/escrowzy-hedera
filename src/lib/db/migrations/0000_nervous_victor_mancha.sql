CREATE TABLE "achievement_nfts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"achievement_id" varchar(50) NOT NULL,
	"token_id" integer,
	"minted_at" timestamp DEFAULT now() NOT NULL,
	"tx_hash" varchar(66),
	CONSTRAINT "achievement_nfts_user_id_achievement_id_unique" UNIQUE("user_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"read" boolean DEFAULT false NOT NULL,
	"notification_type" varchar(50),
	"title" text,
	"message" text,
	"action_url" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(50) NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"metadata" text,
	"updated_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"key_prefix" varchar(10) NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"permissions" jsonb DEFAULT '[]' NOT NULL,
	"rate_limit_per_hour" integer DEFAULT 1000 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"path" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battle_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"from_user_cp" integer NOT NULL,
	"to_user_cp" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	CONSTRAINT "unique_active_invitation" UNIQUE("from_user_id","to_user_id","status")
);
--> statement-breakpoint
CREATE TABLE "battle_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"combat_power" integer NOT NULL,
	"min_cp" integer NOT NULL,
	"max_cp" integer NOT NULL,
	"match_range" integer DEFAULT 20 NOT NULL,
	"search_started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'searching' NOT NULL,
	"matched_with_user_id" integer,
	"queue_position" integer,
	"estimated_wait_time" integer,
	CONSTRAINT "battle_queue_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "battle_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"battle_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"player1_action" text DEFAULT 'attack' NOT NULL,
	"player2_action" text DEFAULT 'attack' NOT NULL,
	"player1_damage" integer DEFAULT 0 NOT NULL,
	"player2_damage" integer DEFAULT 0 NOT NULL,
	"player1_critical" boolean DEFAULT false NOT NULL,
	"player2_critical" boolean DEFAULT false NOT NULL,
	"player1_attack_count" integer DEFAULT 0 NOT NULL,
	"player2_attack_count" integer DEFAULT 0 NOT NULL,
	"player1_defend_count" integer DEFAULT 0 NOT NULL,
	"player2_defend_count" integer DEFAULT 0 NOT NULL,
	"player1_health" integer NOT NULL,
	"player2_health" integer NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_battle_round" UNIQUE("battle_id","round_number")
);
--> statement-breakpoint
CREATE TABLE "battle_session_rejections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"rejected_user_id" integer NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "unique_session_rejection" UNIQUE("user_id","rejected_user_id","session_id")
);
--> statement-breakpoint
CREATE TABLE "battle_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"battle_id" integer NOT NULL,
	"current_round" integer DEFAULT 0 NOT NULL,
	"player1_health" integer DEFAULT 100 NOT NULL,
	"player2_health" integer DEFAULT 100 NOT NULL,
	"player1_actions" jsonb DEFAULT '[]' NOT NULL,
	"player2_actions" jsonb DEFAULT '[]' NOT NULL,
	"player1_energy" integer DEFAULT 0 NOT NULL,
	"player2_energy" integer DEFAULT 0 NOT NULL,
	"player1_defense_energy" integer DEFAULT 0 NOT NULL,
	"player2_defense_energy" integer DEFAULT 0 NOT NULL,
	"player1_stored_energy" integer DEFAULT 0 NOT NULL,
	"player2_stored_energy" integer DEFAULT 0 NOT NULL,
	"player1_stored_defense_energy" integer DEFAULT 0 NOT NULL,
	"player2_stored_defense_energy" integer DEFAULT 0 NOT NULL,
	"player1_total_attacks" integer DEFAULT 0 NOT NULL,
	"player2_total_attacks" integer DEFAULT 0 NOT NULL,
	"player1_total_defends" integer DEFAULT 0 NOT NULL,
	"player2_total_defends" integer DEFAULT 0 NOT NULL,
	"round_history" jsonb DEFAULT '[]' NOT NULL,
	"battle_log" jsonb DEFAULT '[]' NOT NULL,
	"last_action_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "battle_states_battle_id_unique" UNIQUE("battle_id")
);
--> statement-breakpoint
CREATE TABLE "battles" (
	"id" serial PRIMARY KEY NOT NULL,
	"player1_id" integer NOT NULL,
	"player2_id" integer NOT NULL,
	"winner_id" integer,
	"player1_cp" integer NOT NULL,
	"player2_cp" integer NOT NULL,
	"status" text DEFAULT 'preparing' NOT NULL,
	"end_reason" text,
	"fee_discount_percent" integer,
	"discount_expires_at" timestamp,
	"winner_xp" integer DEFAULT 50 NOT NULL,
	"loser_xp" integer DEFAULT 10 NOT NULL,
	"winner_cp" integer DEFAULT 10 NOT NULL,
	"loser_cp" integer DEFAULT -5 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verification_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_requests_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "escrow_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"listing_category" varchar(20) DEFAULT 'p2p' NOT NULL,
	"listing_type" varchar(10) NOT NULL,
	"chain_id" varchar(20),
	"token_address" varchar(255),
	"token_offered" varchar(10),
	"amount" varchar(50),
	"price_per_unit" varchar(50),
	"min_amount" varchar(50),
	"max_amount" varchar(50),
	"payment_methods" jsonb DEFAULT '[]' NOT NULL,
	"payment_window" integer DEFAULT 15 NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(100) NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"scheduled_at" timestamp DEFAULT now() NOT NULL,
	"available_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"failed_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"context_type" varchar(50) NOT NULL,
	"context_id" varchar(255) NOT NULL,
	"last_read_message_id" integer,
	"last_read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_reads_user_id_context_type_context_id_unique" UNIQUE("user_id","context_type","context_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"context_type" varchar(50) NOT NULL,
	"context_id" varchar(255) NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text,
	"message_type" varchar(50) DEFAULT 'text' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" varchar(50) NOT NULL,
	"transaction_hash" varchar(66) NOT NULL,
	"chain_id" integer NOT NULL,
	"amount" varchar(50) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain_id" integer NOT NULL,
	"chain_name" varchar(50) NOT NULL,
	"contract_type" varchar(50) NOT NULL,
	"contract_address" varchar(66) NOT NULL,
	"deployed_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "platform_contracts_chain_id_contract_type_unique" UNIQUE("chain_id","contract_type")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"invited_by_user_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"token" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"role" varchar(50) NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"plan_id" varchar(50) DEFAULT 'free' NOT NULL,
	"is_team_plan" boolean DEFAULT false NOT NULL,
	"team_owner_id" integer,
	"subscription_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrow_id" integer,
	"chain_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"amount" varchar(50) NOT NULL,
	"currency" varchar(10) DEFAULT '' NOT NULL,
	"listing_category" varchar(20) DEFAULT 'p2p' NOT NULL,
	"status" varchar(50) DEFAULT 'created' NOT NULL,
	"metadata" jsonb,
	"deposit_deadline" timestamp,
	"deposited_at" timestamp,
	"payment_sent_at" timestamp,
	"payment_confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_game_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"combat_power" integer DEFAULT 100 NOT NULL,
	"login_streak" integer DEFAULT 0 NOT NULL,
	"last_login_date" timestamp,
	"total_logins" integer DEFAULT 0 NOT NULL,
	"achievements" jsonb DEFAULT '{}' NOT NULL,
	"quest_progress" jsonb DEFAULT '{}' NOT NULL,
	"stats" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_game_data_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" varchar(50) NOT NULL,
	"subscription_expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_trading_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"total_trades" integer DEFAULT 0 NOT NULL,
	"successful_trades" integer DEFAULT 0 NOT NULL,
	"total_volume" varchar(50) DEFAULT '0' NOT NULL,
	"avg_completion_time" integer,
	"disputes_won" integer DEFAULT 0 NOT NULL,
	"disputes_lost" integer DEFAULT 0 NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_trading_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"email" varchar(255),
	"name" varchar(100),
	"password_hash" varchar(255),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"avatar_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "achievement_nfts" ADD CONSTRAINT "achievement_nfts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_invitations" ADD CONSTRAINT "battle_invitations_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_invitations" ADD CONSTRAINT "battle_invitations_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_queue" ADD CONSTRAINT "battle_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_queue" ADD CONSTRAINT "battle_queue_matched_with_user_id_users_id_fk" FOREIGN KEY ("matched_with_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_rounds" ADD CONSTRAINT "battle_rounds_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_session_rejections" ADD CONSTRAINT "battle_session_rejections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_session_rejections" ADD CONSTRAINT "battle_session_rejections_rejected_user_id_users_id_fk" FOREIGN KEY ("rejected_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_states" ADD CONSTRAINT "battle_states_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_player1_id_users_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_player2_id_users_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_requests" ADD CONSTRAINT "email_verification_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_listings" ADD CONSTRAINT "escrow_listings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_last_read_message_id_messages_id_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_team_owner_id_users_id_fk" FOREIGN KEY ("team_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_game_data" ADD CONSTRAINT "user_game_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_trading_stats" ADD CONSTRAINT "user_trading_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_achievement_nfts_user" ON "achievement_nfts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_message" ON "attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_battle_invitations_from" ON "battle_invitations" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "idx_battle_invitations_to" ON "battle_invitations" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "idx_battle_invitations_status" ON "battle_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_battle_invitations_expires" ON "battle_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_battle_queue_user" ON "battle_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_battle_queue_status" ON "battle_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_battle_queue_cp_range" ON "battle_queue" USING btree ("min_cp","max_cp");--> statement-breakpoint
CREATE INDEX "idx_battle_queue_expires" ON "battle_queue" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_battle_rounds_battle" ON "battle_rounds" USING btree ("battle_id");--> statement-breakpoint
CREATE INDEX "idx_battle_rounds_number" ON "battle_rounds" USING btree ("battle_id","round_number");--> statement-breakpoint
CREATE INDEX "idx_battle_rejections_user" ON "battle_session_rejections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_battle_rejections_rejected" ON "battle_session_rejections" USING btree ("rejected_user_id");--> statement-breakpoint
CREATE INDEX "idx_battle_rejections_session" ON "battle_session_rejections" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_battle_rejections_expires" ON "battle_session_rejections" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_battle_states_battle" ON "battle_states" USING btree ("battle_id");--> statement-breakpoint
CREATE INDEX "idx_battle_states_updated" ON "battle_states" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_battles_player1" ON "battles" USING btree ("player1_id");--> statement-breakpoint
CREATE INDEX "idx_battles_player2" ON "battles" USING btree ("player2_id");--> statement-breakpoint
CREATE INDEX "idx_battles_winner" ON "battles" USING btree ("winner_id");--> statement-breakpoint
CREATE INDEX "idx_battles_status" ON "battles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_escrow_listings_user" ON "escrow_listings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_escrow_listings_active" ON "escrow_listings" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_escrow_listings_type" ON "escrow_listings" USING btree ("listing_type");--> statement-breakpoint
CREATE INDEX "idx_escrow_listings_category" ON "escrow_listings" USING btree ("listing_category");--> statement-breakpoint
CREATE INDEX "idx_job_queue_status" ON "job_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_job_queue_type" ON "job_queue" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_job_queue_available" ON "job_queue" USING btree ("available_at","status");--> statement-breakpoint
CREATE INDEX "idx_job_queue_scheduled" ON "job_queue" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_messages_context" ON "messages" USING btree ("context_type","context_id");--> statement-breakpoint
CREATE INDEX "idx_messages_created" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_trades_escrow" ON "trades" USING btree ("chain_id","escrow_id");--> statement-breakpoint
CREATE INDEX "idx_trades_status" ON "trades" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_trades_buyer" ON "trades" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "idx_trades_seller" ON "trades" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_trades_deposit_deadline" ON "trades" USING btree ("deposit_deadline");--> statement-breakpoint
CREATE INDEX "idx_trades_category" ON "trades" USING btree ("listing_category");--> statement-breakpoint
CREATE INDEX "idx_user_game_data_user" ON "user_game_data" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_trading_stats_user" ON "user_trading_stats" USING btree ("user_id");