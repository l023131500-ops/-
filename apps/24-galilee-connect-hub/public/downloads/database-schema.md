# Mehubarim - Database Schema Export
Generated: Tue May 19 05:59:32 UTC 2026

## Tables:
activity_slides
ad_banners
azkarot_requests
community_leads
daily_halacha
gabai_accounts
gallery_images
kashrut_establishments
knowledge_base
mikvaot
newsletters
rabbi_questions
synagogue_announcements
synagogue_gabbaim
synagogue_lessons
synagogue_prayer_times
synagogues

## Full Schema Details:

### Table: activity_slides
                          Table "public.activity_slides"
   Column   |           Type           | Collation | Nullable |      Default      
------------+--------------------------+-----------+----------+-------------------
 id         | uuid                     |           | not null | gen_random_uuid()
 image_url  | text                     |           | not null | 
 caption    | text                     |           |          | ''::text
 created_at | timestamp with time zone |           | not null | now()
Indexes:
    "activity_slides_pkey" PRIMARY KEY, btree (id)
Policies:
    POLICY "Activity slides public read" FOR SELECT
      USING (true)
    POLICY "Activity slides writable"
      USING (true)
      WITH CHECK (true)


Row count: 1

### Table: ad_banners
                            Table "public.ad_banners"
   Column   |           Type           | Collation | Nullable |      Default      
------------+--------------------------+-----------+----------+-------------------
 id         | uuid                     |           | not null | gen_random_uuid()
 title      | text                     |           | not null | 
 image_url  | text                     |           | not null | 
 link       | text                     |           |          | 
 start_date | date                     |           |          | 
 end_date   | date                     |           |          | 
 is_active  | boolean                  |           |          | true
 created_at | timestamp with time zone |           | not null | now()
 size       | text                     |           | not null | 'medium'::text
 position   | text                     |           | not null | 'center'::text
Indexes:
    "ad_banners_pkey" PRIMARY KEY, btree (id)
    "idx_banners_dates" btree (start_date, end_date)
Policies:
    POLICY "Banners public read" FOR SELECT
      USING (true)
    POLICY "Banners writable"
      USING (true)
      WITH CHECK (true)


Row count: 0

### Table: azkarot_requests
                           Table "public.azkarot_requests"
     Column     |           Type           | Collation | Nullable |      Default      
----------------+--------------------------+-----------+----------+-------------------
 id             | uuid                     |           | not null | gen_random_uuid()
 name           | text                     |           | not null | 
 phone          | text                     |           | not null | 
 deceased_name  | text                     |           | not null | 
 request_type   | text                     |           | not null | 'azkara'::text
 date_requested | date                     |           |          | 
 notes          | text                     |           |          | 
 is_read        | boolean                  |           |          | false
 created_at     | timestamp with time zone |           | not null | now()
Indexes:
    "azkarot_requests_pkey" PRIMARY KEY, btree (id)
Policies:
    POLICY "Azkarot public insert" FOR INSERT
      WITH CHECK (true)
    POLICY "Azkarot readable" FOR SELECT
      USING (true)
    POLICY "Azkarot writable"
      USING (true)
      WITH CHECK (true)


Row count: 0

### Table: community_leads
                           Table "public.community_leads"
    Column    |           Type           | Collation | Nullable |      Default      
--------------+--------------------------+-----------+----------+-------------------
 id           | uuid                     |           | not null | gen_random_uuid()
 name         | text                     |           | not null | 
 phone        | text                     |           |          | 
 email        | text                     |           |          | 
 message      | text                     |           | not null | 
 lead_type    | text                     |           | not null | 
 synagogue_id | uuid                     |           |          | 
 is_read      | boolean                  |           |          | false
 created_at   | timestamp with time zone |           | not null | now()
Indexes:
    "community_leads_pkey" PRIMARY KEY, btree (id)
    "idx_leads_type" btree (lead_type)
Check constraints:
    "community_leads_lead_type_check" CHECK (lead_type = ANY (ARRAY['general'::text, 'synagogue'::text, 'rabbi_question'::text, 'gabbai_support'::text]))
Foreign-key constraints:
    "community_leads_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE SET NULL
Policies:
    POLICY "Leads public insert" FOR INSERT
      WITH CHECK (true)
    POLICY "Leads readable" FOR SELECT
      USING (true)
    POLICY "Leads writable"
      USING (true)
      WITH CHECK (true)


Row count: 0

### Table: daily_halacha
                            Table "public.daily_halacha"
    Column    |           Type           | Collation | Nullable |      Default       
--------------+--------------------------+-----------+----------+--------------------
 id           | uuid                     |           | not null | gen_random_uuid()
 title        | text                     |           | not null | 
 content      | text                     |           | not null | 
 hebrew_date  | text                     |           |          | 
 category     | text                     |           | not null | 'הלכה יומית'::text
 is_seasonal  | boolean                  |           |          | false
 is_active    | boolean                  |           |          | true
 display_date | date                     |           |          | CURRENT_DATE
 created_at   | timestamp with time zone |           | not null | now()
 updated_at   | timestamp with time zone |           | not null | now()
Indexes:
    "daily_halacha_pkey" PRIMARY KEY, btree (id)
Policies:
    POLICY "Halacha public read" FOR SELECT
      USING (true)
    POLICY "Halacha writable"
      USING (true)
      WITH CHECK (true)
Triggers:
    update_daily_halacha_updated_at BEFORE UPDATE ON daily_halacha FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()


Row count: 3

### Table: gabai_accounts
                            Table "public.gabai_accounts"
    Column     |           Type           | Collation | Nullable |      Default      
---------------+--------------------------+-----------+----------+-------------------
 id            | uuid                     |           | not null | gen_random_uuid()
 username      | text                     |           | not null | 
 password_hash | text                     |           | not null | 
 display_name  | text                     |           | not null | 
 synagogue_id  | uuid                     |           |          | 
 is_admin      | boolean                  |           |          | false
 is_active     | boolean                  |           |          | true
 created_at    | timestamp with time zone |           | not null | now()
 updated_at    | timestamp with time zone |           | not null | now()
Indexes:
    "gabai_accounts_pkey" PRIMARY KEY, btree (id)
    "gabai_accounts_username_key" UNIQUE CONSTRAINT, btree (username)
    "idx_gabai_synagogue" btree (synagogue_id)
Foreign-key constraints:
    "gabai_accounts_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE SET NULL
Policies:
    POLICY "Gabai accounts writable"
      USING (true)
      WITH CHECK (true)
Triggers:
    update_gabai_updated_at BEFORE UPDATE ON gabai_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()


Row count: 2

### Table: gallery_images
                          Table "public.gallery_images"
   Column   |           Type           | Collation | Nullable |      Default      
------------+--------------------------+-----------+----------+-------------------
 id         | uuid                     |           | not null | gen_random_uuid()
 image_url  | text                     |           | not null | 
 caption    | text                     |           |          | ''::text
 created_at | timestamp with time zone |           | not null | now()
Indexes:
    "gallery_images_pkey" PRIMARY KEY, btree (id)
Policies:
    POLICY "Gallery public read" FOR SELECT
      USING (true)
    POLICY "Gallery writable"
      USING (true)
      WITH CHECK (true)


Row count: 3

### Table: kashrut_establishments
                         Table "public.kashrut_establishments"
     Column      |           Type           | Collation | Nullable |      Default      
-----------------+--------------------------+-----------+----------+-------------------
 id              | uuid                     |           | not null | gen_random_uuid()
 name            | text                     |           | not null | 
 category        | text                     |           | not null | 
 address         | text                     |           | not null | 
 phone           | text                     |           |          | 
 kashrut_level   | text                     |           | not null | 
 certifying_body | text                     |           |          | 
 mashgiach_name  | text                     |           |          | 
 mashgiach_phone | text                     |           |          | 
 opening_hours   | text                     |           |          | 
 notes           | text                     |           |          | 
 is_active       | boolean                  |           |          | true
 created_at      | timestamp with time zone |           | not null | now()
 updated_at      | timestamp with time zone |           | not null | now()
Indexes:
    "kashrut_establishments_pkey" PRIMARY KEY, btree (id)
    "idx_kashrut_level" btree (kashrut_level)
Check constraints:
    "kashrut_establishments_kashrut_level_check" CHECK (kashrut_level = ANY (ARRAY['mehadrin'::text, 'regular'::text]))
Policies:
    POLICY "Kashrut public read" FOR SELECT
      USING (true)
    POLICY "Kashrut writable"
      USING (true)
      WITH CHECK (true)
Triggers:
    update_kashrut_updated_at BEFORE UPDATE ON kashrut_establishments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()


Row count: 5

### Table: knowledge_base
                           Table "public.knowledge_base"
    Column    |           Type           | Collation | Nullable |      Default      
--------------+--------------------------+-----------+----------+-------------------
 id           | uuid                     |           | not null | gen_random_uuid()
 category     | text                     |           | not null | 
 subcategory  | text                     |           |          | 
 title        | text                     |           | not null | 
 content      | text                     |           | not null | 
 phone        | text                     |           |          | 
 address      | text                     |           |          | 
 contact_name | text                     |           |          | 
 image_url    | text                     |           |          | 
 is_active    | boolean                  |           |          | true
 created_at   | timestamp with time zone |           | not null | now()
 updated_at   | timestamp with time zone |           | not null | now()
Indexes:
    "knowledge_base_pkey" PRIMARY KEY, btree (id)
Policies:
    POLICY "Knowledge public read" FOR SELECT
      USING (true)
    POLICY "Knowledge writable"
      USING (true)
      WITH CHECK (true)


Row count: 28

### Table: mikvaot
                                      Table "public.mikvaot"
           Column            |           Type           | Collation | Nullable |      Default      
-----------------------------+--------------------------+-----------+----------+-------------------
 id                          | uuid                     |           | not null | gen_random_uuid()
 name                        | text                     |           | not null | 
 type                        | text                     |           | not null | 
 address                     | text                     |           | not null | 
 phone                       | text                     |           |          | 
 manager_name                | text                     |           |          | 
 manager_phone               | text                     |           |          | 
 rabbi_tahara_name           | text                     |           |          | 
 rabbi_tahara_phone          | text                     |           |          | 
 opening_hours               | text                     |           |          | 
 bride_groom_counselor_name  | text                     |           |          | 
 bride_groom_counselor_phone | text                     |           |          | 
 notes                       | text                     |           |          | 
 is_active                   | boolean                  |           |          | true
 created_at                  | timestamp with time zone |           | not null | now()
 updated_at                  | timestamp with time zone |           | not null | now()
Indexes:
    "mikvaot_pkey" PRIMARY KEY, btree (id)
    "idx_mikvaot_type" btree (type)
Check constraints:
    "mikvaot_type_check" CHECK (type = ANY (ARRAY['men'::text, 'women'::text]))
Policies:
    POLICY "Mikvaot public read" FOR SELECT
      USING (true)
    POLICY "Mikvaot writable"
      USING (true)
      WITH CHECK (true)
Triggers:
    update_mikvaot_updated_at BEFORE UPDATE ON mikvaot FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()


Row count: 2

### Table: newsletters
                            Table "public.newsletters"
   Column    |           Type           | Collation | Nullable |      Default      
-------------+--------------------------+-----------+----------+-------------------
 id          | uuid                     |           | not null | gen_random_uuid()
 title       | text                     |           | not null | 
 description | text                     |           |          | 
 pdf_url     | text                     |           | not null | 
 issue_date  | date                     |           | not null | CURRENT_DATE
 is_active   | boolean                  |           |          | true
 created_at  | timestamp with time zone |           | not null | now()
Indexes:
    "newsletters_pkey" PRIMARY KEY, btree (id)
Policies:
    POLICY "Newsletters public read" FOR SELECT
      USING (true)
    POLICY "Newsletters writable"
      USING (true)
      WITH CHECK (true)


Row count: 0

### Table: rabbi_questions
                            Table "public.rabbi_questions"
     Column     |           Type           | Collation | Nullable |      Default       
----------------+--------------------------+-----------+----------+--------------------
 id             | uuid                     |           | not null | gen_random_uuid()
 name           | text                     |           | not null | 
 question       | text                     |           | not null | 
 contact_method | text                     |           | not null | 'whatsapp'::text
 contact_value  | text                     |           | not null | 
 destination    | text                     |           | not null | 'beit_horaa'::text
 urgent         | boolean                  |           |          | false
 is_read        | boolean                  |           |          | false
 created_at     | timestamp with time zone |           | not null | now()
Indexes:
    "rabbi_questions_pkey" PRIMARY KEY, btree (id)
Policies:
    POLICY "Rabbi questions deletable" FOR DELETE
      USING (true)
    POLICY "Rabbi questions public insert" FOR INSERT
      WITH CHECK (true)
    POLICY "Rabbi questions readable" FOR SELECT
      USING (true)
    POLICY "Rabbi questions updatable" FOR UPDATE
      USING (true)


Row count: 1

### Table: synagogue_announcements
                       Table "public.synagogue_announcements"
    Column    |           Type           | Collation | Nullable |      Default      
--------------+--------------------------+-----------+----------+-------------------
 id           | uuid                     |           | not null | gen_random_uuid()
 synagogue_id | uuid                     |           | not null | 
 content      | text                     |           | not null | 
 image_url    | text                     |           |          | 
 is_active    | boolean                  |           |          | true
 created_at   | timestamp with time zone |           | not null | now()
Indexes:
    "synagogue_announcements_pkey" PRIMARY KEY, btree (id)
    "idx_announcements_synagogue" btree (synagogue_id)
Foreign-key constraints:
    "synagogue_announcements_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE CASCADE
Policies:
    POLICY "Announcements public read" FOR SELECT
      USING (true)
    POLICY "Announcements writable"
      USING (true)
      WITH CHECK (true)


Row count: 13

### Table: synagogue_gabbaim
                          Table "public.synagogue_gabbaim"
    Column    |           Type           | Collation | Nullable |      Default      
--------------+--------------------------+-----------+----------+-------------------
 id           | uuid                     |           | not null | gen_random_uuid()
 synagogue_id | uuid                     |           | not null | 
 name         | text                     |           | not null | 
 phone        | text                     |           | not null | 
 created_at   | timestamp with time zone |           | not null | now()
Indexes:
    "synagogue_gabbaim_pkey" PRIMARY KEY, btree (id)
    "idx_gabbaim_synagogue" btree (synagogue_id)
Foreign-key constraints:
    "synagogue_gabbaim_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE CASCADE
Policies:
    POLICY "Gabbaim contacts public read" FOR SELECT
      USING (true)
    POLICY "Gabbaim contacts writable"
      USING (true)
      WITH CHECK (true)


Row count: 21

### Table: synagogue_lessons
                          Table "public.synagogue_lessons"
    Column    |           Type           | Collation | Nullable |      Default      
--------------+--------------------------+-----------+----------+-------------------
 id           | uuid                     |           | not null | gen_random_uuid()
 synagogue_id | uuid                     |           | not null | 
 subject      | text                     |           | not null | 
 teacher      | text                     |           | not null | 
 day          | text                     |           | not null | 
 time         | text                     |           | not null | 
 audience     | text                     |           |          | 
 location     | text                     |           |          | 
 created_at   | timestamp with time zone |           | not null | now()
Indexes:
    "synagogue_lessons_pkey" PRIMARY KEY, btree (id)
    "idx_lessons_synagogue" btree (synagogue_id)
Foreign-key constraints:
    "synagogue_lessons_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE CASCADE
Policies:
    POLICY "Lessons public read" FOR SELECT
      USING (true)
    POLICY "Lessons writable"
      USING (true)
      WITH CHECK (true)


Row count: 23

### Table: synagogue_prayer_times
                       Table "public.synagogue_prayer_times"
    Column    |           Type           | Collation | Nullable |      Default      
--------------+--------------------------+-----------+----------+-------------------
 id           | uuid                     |           | not null | gen_random_uuid()
 synagogue_id | uuid                     |           | not null | 
 name         | text                     |           | not null | 
 time         | text                     |           | not null | 
 day          | text                     |           | not null | 
 no_minyan    | boolean                  |           |          | false
 created_at   | timestamp with time zone |           | not null | now()
Indexes:
    "synagogue_prayer_times_pkey" PRIMARY KEY, btree (id)
    "idx_prayer_times_synagogue" btree (synagogue_id)
Check constraints:
    "synagogue_prayer_times_day_check" CHECK (day = ANY (ARRAY['weekday'::text, 'shabbat'::text, 'holiday'::text]))
Foreign-key constraints:
    "synagogue_prayer_times_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE CASCADE
Policies:
    POLICY "Prayer times public read" FOR SELECT
      USING (true)
    POLICY "Prayer times writable"
      USING (true)
      WITH CHECK (true)


Row count: 83

### Table: synagogues
                                Table "public.synagogues"
      Column       |           Type           | Collation | Nullable |      Default      
-------------------+--------------------------+-----------+----------+-------------------
 id                | uuid                     |           | not null | gen_random_uuid()
 name              | text                     |           | not null | 
 neighborhood      | text                     |           | not null | 
 nusach            | text                     |           | not null | 
 rabbi             | text                     |           |          | 
 address           | text                     |           | not null | 
 logo_url          | text                     |           |          | 
 background_preset | integer                  |           |          | 1
 donation_link     | text                     |           |          | 
 created_at        | timestamp with time zone |           | not null | now()
 updated_at        | timestamp with time zone |           | not null | now()
Indexes:
    "synagogues_pkey" PRIMARY KEY, btree (id)
Referenced by:
    TABLE "community_leads" CONSTRAINT "community_leads_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE SET NULL
    TABLE "gabai_accounts" CONSTRAINT "gabai_accounts_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE SET NULL
    TABLE "synagogue_announcements" CONSTRAINT "synagogue_announcements_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE CASCADE
    TABLE "synagogue_gabbaim" CONSTRAINT "synagogue_gabbaim_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE CASCADE
    TABLE "synagogue_lessons" CONSTRAINT "synagogue_lessons_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE CASCADE
    TABLE "synagogue_prayer_times" CONSTRAINT "synagogue_prayer_times_synagogue_id_fkey" FOREIGN KEY (synagogue_id) REFERENCES synagogues(id) ON DELETE CASCADE
Policies:
    POLICY "Synagogues are publicly readable" FOR SELECT
      USING (true)
    POLICY "Synagogues writable via service role"
      USING (true)
      WITH CHECK (true)
Triggers:
    update_synagogues_updated_at BEFORE UPDATE ON synagogues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()


Row count: 17
