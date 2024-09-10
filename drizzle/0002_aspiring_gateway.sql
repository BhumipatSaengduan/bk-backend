CREATE TABLE IF NOT EXISTS "users_to_books" (
	"book_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "users_to_books_book_id_user_id_pk" PRIMARY KEY("book_id","user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_to_books" ADD CONSTRAINT "users_to_books_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_to_books" ADD CONSTRAINT "users_to_books_user_id_books_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
