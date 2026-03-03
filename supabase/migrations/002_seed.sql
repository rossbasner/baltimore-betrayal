-- ============================================================
-- Baltimore Betrayal — Seed Data
-- Schedule: Friday March 6 – Sunday March 8, 2026
-- Adjust timestamps to match your actual game weekend
-- ============================================================

INSERT INTO schedule_events (title, scheduled_time, day, sort_order) VALUES
-- FRIDAY
('Arrival & Cocktail Hour',          '2026-03-06T18:00:00-05:00', 'friday', 1),
('Welcome Dinner',                    '2026-03-06T19:00:00-05:00', 'friday', 2),
('Game Kickoff Ceremony',             '2026-03-06T20:00:00-05:00', 'friday', 3),
('Secret Envelope Distribution',      '2026-03-06T20:30:00-05:00', 'friday', 4),
('Traitors'' First Meeting',          '2026-03-06T21:00:00-05:00', 'friday', 5),
('Challenge #1: Web of Lies',         '2026-03-06T21:30:00-05:00', 'friday', 6),
('Drinking Game: Flip Cup',           '2026-03-06T22:15:00-05:00', 'friday', 7),
('Murder Announced',                  '2026-03-06T23:30:00-05:00', 'friday', 8),

-- SATURDAY
('Breakfast',                         '2026-03-07T08:00:00-05:00', 'saturday', 1),
('Challenge #2: Traitor''s Gauntlet (Codenames)', '2026-03-07T09:00:00-05:00', 'saturday', 2),
('Free Time / Scheming',              '2026-03-07T10:00:00-05:00', 'saturday', 3),
('Roundtable #1',                     '2026-03-07T11:00:00-05:00', 'saturday', 4),
('Lunch',                             '2026-03-07T12:00:00-05:00', 'saturday', 5),
('Challenge #3: Faithful or Fake',    '2026-03-07T13:00:00-05:00', 'saturday', 6),
('Free Time / Scheming',              '2026-03-07T14:00:00-05:00', 'saturday', 7),
('Traitors Meet Secretly',            '2026-03-07T15:00:00-05:00', 'saturday', 8),
('Happy Hour',                        '2026-03-07T17:00:00-05:00', 'saturday', 9),
('Dinner',                            '2026-03-07T18:00:00-05:00', 'saturday', 10),
('Challenge #4: Saboteur''s Trivia',  '2026-03-07T19:00:00-05:00', 'saturday', 11),
('Murder Announced',                  '2026-03-07T20:00:00-05:00', 'saturday', 12),
('Roundtable #2',                     '2026-03-07T20:30:00-05:00', 'saturday', 13),
('Drinking Game: Kings Cup',          '2026-03-07T21:30:00-05:00', 'saturday', 14),
('Secret Word Game Begins (limbo players only)', '2026-03-07T22:30:00-05:00', 'saturday', 15),
('Secret Word Game Ends',             '2026-03-08T00:00:00-05:00', 'saturday', 16),

-- SUNDAY
('Brunch',                            '2026-03-08T08:30:00-05:00', 'sunday', 1),
('Challenge #5: Last Stand',          '2026-03-08T09:30:00-05:00', 'sunday', 2),
('Murder Announced',                  '2026-03-08T10:30:00-05:00', 'sunday', 3),
('Roundtable #3',                     '2026-03-08T11:00:00-05:00', 'sunday', 4),
('Lunch',                             '2026-03-08T12:00:00-05:00', 'sunday', 5),
('Roundtable #4',                     '2026-03-08T13:00:00-05:00', 'sunday', 6),
('Final Roundtable',                  '2026-03-08T14:00:00-05:00', 'sunday', 7),
('The Reveal',                        '2026-03-08T15:30:00-05:00', 'sunday', 8),
('Drinks & Debrief',                  '2026-03-08T16:00:00-05:00', 'sunday', 9);
