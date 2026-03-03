-- ============================================================
-- Baltimore Betrayal — Updated Itinerary
-- Replaces all schedule events with revised weekend schedule
-- ============================================================

DELETE FROM schedule_events;

INSERT INTO schedule_events (title, scheduled_time, day, sort_order) VALUES

-- FRIDAY March 6
('Arrival & Cocktail Hour',               '2026-03-06T18:00:00-05:00', 'friday',   1),
('Welcome Dinner',                        '2026-03-06T19:00:00-05:00', 'friday',   2),
('Game Kickoff Ceremony',                 '2026-03-06T20:00:00-05:00', 'friday',   3),
('Roles Revealed',                        '2026-03-06T20:30:00-05:00', 'friday',   4),
('Challenge #1: Drinking Games Til Death','2026-03-06T21:15:00-05:00', 'friday',   5),
('First Murder',                          '2026-03-06T23:30:00-05:00', 'friday',   6),

-- SATURDAY March 7
('Breakfast',                             '2026-03-07T08:00:00-05:00', 'saturday', 1),
('Roundtable #1',                         '2026-03-07T10:00:00-05:00', 'saturday', 2),
('Challenge #2: Codenames',               '2026-03-07T10:30:00-05:00', 'saturday', 3),
('Lunch & Roundtable #2',                 '2026-03-07T12:30:00-05:00', 'saturday', 4),
('Murder #2',                             '2026-03-07T13:30:00-05:00', 'saturday', 5),
('Challenge #3: Faithful or Fake',        '2026-03-07T14:00:00-05:00', 'saturday', 6),
('Roundtable #3',                         '2026-03-07T18:30:00-05:00', 'saturday', 7),
('Secret Challenge for Players in Limbo', '2026-03-07T18:45:00-05:00', 'saturday', 8),
('Dinner',                                '2026-03-07T19:30:00-05:00', 'saturday', 9),
('Murder #3',                             '2026-03-07T21:00:00-05:00', 'saturday', 10),
('Challenge #4: Drinking Games Til Death','2026-03-07T21:30:00-05:00', 'saturday', 11),

-- SUNDAY March 8
('Secret Challenge Winner Reinstated',    '2026-03-08T09:00:00-05:00', 'sunday',   1),
('Murder #4',                             '2026-03-08T09:30:00-05:00', 'sunday',   2),
('Breakfast & Roundtable #4',             '2026-03-08T10:00:00-05:00', 'sunday',   3),
('Challenge #5: Last Stand',              '2026-03-08T11:00:00-05:00', 'sunday',   4),
('Lunch & Roundtable #5',                '2026-03-08T13:00:00-05:00', 'sunday',   5),
('Final Table',                           '2026-03-08T14:00:00-05:00', 'sunday',   6);
