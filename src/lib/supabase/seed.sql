-- Insert Dummy Pitches
insert into public.pitches (name, description, location, price_per_hour, amenities, images)
values 
('Seoul Futsal Park', 'Premium outdoor futsal court with excellent lighting.', 'Gangnam-gu, Seoul', 80000, ARRAY['Lighting', 'Shower', 'Parking'], ARRAY['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?q=80&w=2070&auto=format&fit=crop']),
('Han River Pitch', 'Enjoy the breeze while playing near the Han River.', 'Yeouido, Seoul', 60000, ARRAY['Parking', 'Bench'], ARRAY['https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=2070&auto=format&fit=crop']),
('Indoors Arena K', 'Climate controlled indoor pitch for all weather play.', 'Songpa-gu, Seoul', 100000, ARRAY['Indoor', 'Air Conditioning', 'Lounge'], ARRAY['https://images.unsplash.com/photo-1575361204480-aadea25e6e68?q=80&w=2071&auto=format&fit=crop']),
('Skyline Rooftop Field', 'Amazing city views from the rooftop.', 'Mapo-gu, Seoul', 90000, ARRAY['Lighting', 'Rooftop', 'Vending Machine'], ARRAY['https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2093&auto=format&fit=crop']),
('Urban Kick', 'Accessible and affordable simplified pitch.', 'Seongdong-gu, Seoul', 50000, ARRAY['Water Fountain'], ARRAY['https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=2000&auto=format&fit=crop']);
