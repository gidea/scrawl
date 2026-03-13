CREATE TABLE `content_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL REFERENCES `content_workspaces`(`id`) ON DELETE cascade,
	`name` text NOT NULL,
	`description` text,
	`system_prompt` text NOT NULL,
	`icon` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_content_roles_workspace_id` ON `content_roles` (`workspace_id`);
