CREATE TABLE "cms_documents" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"type" varchar(40) NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" varchar(64) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"donor" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donations_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(24) NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"message" text,
	"payload" jsonb,
	"status" varchar(24) DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
