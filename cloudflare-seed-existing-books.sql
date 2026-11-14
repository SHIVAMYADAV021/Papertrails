-- Run this ONCE in Cloudflare D1 Console for paper-trails-db.
-- It preserves the three books already shown on the original public website.

INSERT INTO books (title, author, description, genre, age_group, book_type, cover_url, pdf_url, is_published)
SELECT 'Dear Disputable Diaries', 'Aryan & Esha', 'The Twins Who Never Agree', 'Funny', 'Ages 7–13', 'Free', 'https://papertrails-web.vercel.app/assets/dear-disputable-diaries.jpg', '', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Dear Disputable Diaries');

INSERT INTO books (title, author, description, genre, age_group, book_type, cover_url, pdf_url, is_published)
SELECT 'Survival', 'Aadhvika, with Nikita Yadav', 'Dumped into a different world, what's next?', 'Adventure', 'Ages 7–13', 'Free', 'https://papertrails-web.vercel.app/assets/survival.jpg', '', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Survival');

INSERT INTO books (title, author, description, genre, age_group, book_type, cover_url, pdf_url, is_published)
SELECT 'Love Right Next Door', 'Olivia Nadal', 'They were an unlikely pair.', 'Friendship', 'Ages 7–13', 'Free', 'https://papertrails-web.vercel.app/assets/love-right-next-door.jpg', '', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Love Right Next Door');
