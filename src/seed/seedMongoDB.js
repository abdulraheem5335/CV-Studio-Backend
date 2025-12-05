/**
 * MongoDB Seed Script
 * Seeds initial data from dummy data structure to MongoDB
 * Run: node src/seed/seedMongoDB.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const { User, Post, Event, Zone, Quest, Badge, Item, Club } = require('../models');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://raheem123:10309934Mongodb@container.p3uafo8.mongodb.net/nust_campus';

// ============ SEED DATA ============

// Badges (need to be created first for references)
const badgesData = [
  { badgeId: 'badge-1', name: 'First Steps', description: 'Complete your first quest', icon: '👣', rarity: 'common', category: 'achievement', criteria: { type: 'quest_complete', value: 1 }, rewards: { xp: 25, points: 10 } },
  { badgeId: 'badge-2', name: 'Bookworm', description: 'Visit the library 10 times', icon: '📚', rarity: 'uncommon', category: 'exploration', criteria: { type: 'zone_visits', targetZone: 'central-library', value: 10 }, rewards: { xp: 50, points: 25 } },
  { badgeId: 'badge-3', name: 'Social Butterfly', description: 'Create 50 posts', icon: '🦋', rarity: 'rare', category: 'social', criteria: { type: 'post_count', value: 50 }, rewards: { xp: 100, points: 50 } },
  { badgeId: 'badge-4', name: 'Tech Wizard', description: 'Complete all SEECS quests', icon: '🧙', rarity: 'epic', category: 'achievement', criteria: { type: 'quest_category', category: 'seecs', value: 5 }, rewards: { xp: 200, points: 100 } },
  { badgeId: 'badge-5', name: 'Explorer', description: 'Visit all campus zones', icon: '🗺️', rarity: 'rare', category: 'exploration', criteria: { type: 'zones_visited', value: 10 }, rewards: { xp: 150, points: 75 } },
  { badgeId: 'badge-6', name: 'Quiz Master', description: 'Win 10 quiz games', icon: '🧠', rarity: 'uncommon', category: 'achievement', criteria: { type: 'minigame_wins', minigameId: 'quiz-master', value: 10 }, rewards: { xp: 75, points: 40 } },
  { badgeId: 'badge-7', name: 'Early Bird', description: '7-day login streak', icon: '🐦', rarity: 'common', category: 'achievement', criteria: { type: 'login_streak', value: 7 }, rewards: { xp: 50, points: 25 } },
  { badgeId: 'badge-8', name: 'Night Owl', description: 'Active after midnight 10 times', icon: '🦉', rarity: 'uncommon', category: 'special', criteria: { type: 'late_night_activity', value: 10 }, rewards: { xp: 60, points: 30 } },
];

// Items
const itemsData = [
  { itemId: 'item-1', name: 'Cool Sunglasses', description: 'Stylish shades for the campus celebrity', type: 'accessory', avatarSlot: 'face', rarity: 'common', cost: { points: 100 } },
  { itemId: 'item-2', name: 'NUST Hoodie', description: 'Official NUST merchandise - stay warm in style', type: 'outfit', avatarSlot: 'body', rarity: 'uncommon', cost: { points: 250 } },
  { itemId: 'item-3', name: 'Golden Frame', description: 'A prestigious golden profile frame', type: 'background', avatarSlot: 'background', rarity: 'rare', cost: { points: 500 } },
  { itemId: 'item-4', name: 'XP Boost', description: 'Double your XP gains for 1 hour', type: 'consumable', rarity: 'uncommon', cost: { points: 150 }, effects: [{ type: 'xp_multiplier', value: 2, duration: 3600 }] },
  { itemId: 'item-5', name: 'Party Hat', description: 'Celebrate every moment!', type: 'accessory', avatarSlot: 'head', rarity: 'common', cost: { points: 75 } },
  { itemId: 'item-6', name: 'Lucky Charm', description: 'Increases point rewards by 50% for 30 minutes', type: 'consumable', rarity: 'rare', cost: { points: 300 }, effects: [{ type: 'points_multiplier', value: 1.5, duration: 1800 }] },
];

// Zones
const zonesData = [
  {
    zoneId: 'main-gate',
    name: 'Main Gate',
    description: 'The grand entrance to NUST campus. Your adventure begins here!',
    type: 'entrance',
    bounds: { x: 380, y: 480, width: 40, height: 40 },
    center: { x: 400, y: 500 },
    color: '#EF4444',
    icon: '🚪',
    connections: [
      { zoneId: 'admin-block', distance: 150 },
      { zoneId: 'central-library', distance: 200 }
    ],
    interactions: [{ type: 'quest', name: 'Welcome Quest', description: 'Start your campus journey' }],
  },
  {
    zoneId: 'central-library',
    name: 'Central Library',
    description: 'The heart of knowledge at NUST. Perfect for bookworms and scholars seeking wisdom.',
    type: 'academic',
    bounds: { x: 480, y: 300, width: 80, height: 60 },
    center: { x: 520, y: 330 },
    color: '#8B5CF6',
    icon: '📚',
    connections: [
      { zoneId: 'main-gate', distance: 200 },
      { zoneId: 'seecs', distance: 160 },
      { zoneId: 'cafeteria', distance: 120 }
    ],
    interactions: [
      { type: 'post', name: 'Study Corner', description: 'Share study tips' },
      { type: 'quest', name: 'Book Hunt', description: 'Find rare books' },
      { type: 'minigame', name: 'Quiz Master', description: 'Test your knowledge' }
    ],
    minigames: [{ gameId: 'quiz-master', name: 'Quiz Master', rewards: { xp: 50, points: 25 } }],
    secrets: [{ secretId: 'hidden-book', name: 'Ancient Tome', description: 'A rare ancient book hidden in the stacks', reward: { xp: 100 } }],
  },
  {
    zoneId: 'seecs',
    name: 'SEECS',
    description: 'School of Electrical Engineering & Computer Science. Hub for tech enthusiasts and coders.',
    type: 'academic',
    bounds: { x: 640, y: 250, width: 80, height: 60 },
    center: { x: 680, y: 280 },
    color: '#3B82F6',
    icon: '💻',
    connections: [
      { zoneId: 'central-library', distance: 160 },
      { zoneId: 'nbs', distance: 100 }
    ],
    interactions: [
      { type: 'post', name: 'Tech Talk', description: 'Discuss technology' },
      { type: 'quest', name: 'Code Challenge', description: 'Solve coding puzzles' },
      { type: 'minigame', name: 'Debug Master', description: 'Find and fix bugs' }
    ],
    minigames: [{ gameId: 'debug-master', name: 'Debug Master', rewards: { xp: 75, points: 35 } }],
  },
  {
    zoneId: 'cafeteria',
    name: 'Cafeteria',
    description: 'The social hub of campus! Grab food, meet friends, and share stories.',
    type: 'social',
    bounds: { x: 510, y: 420, width: 80, height: 60 },
    center: { x: 550, y: 450 },
    color: '#F59E0B',
    icon: '🍔',
    connections: [
      { zoneId: 'central-library', distance: 120 },
      { zoneId: 'girls-hostel', distance: 150 }
    ],
    interactions: [
      { type: 'post', name: 'Food Reviews', description: 'Rate the food' },
      { type: 'quest', name: 'Foodie Quest', description: 'Try all menu items' }
    ],
  },
  {
    zoneId: 'sports-complex',
    name: 'Sports Complex',
    description: 'Stay fit and compete! Football, cricket, basketball, and gym facilities.',
    type: 'sports',
    bounds: { x: 260, y: 270, width: 80, height: 60 },
    center: { x: 300, y: 300 },
    color: '#10B981',
    icon: '⚽',
    connections: [
      { zoneId: 'admin-block', distance: 100 },
      { zoneId: 'boys-hostel', distance: 140 }
    ],
    interactions: [
      { type: 'quest', name: 'Fitness Challenge', description: 'Complete fitness goals' },
      { type: 'minigame', name: 'Football Match', description: 'Play multiplayer football' }
    ],
    minigames: [{ gameId: 'football-game', name: 'Football Match', rewards: { xp: 100, points: 50 } }],
  },
  {
    zoneId: 'boys-hostel',
    name: 'Boys Hostel',
    description: 'Home away from home for male students. Chill, study, and bond with hostelites.',
    type: 'residential',
    bounds: { x: 160, y: 370, width: 80, height: 60 },
    center: { x: 200, y: 400 },
    color: '#6366F1',
    icon: '🏠',
    connections: [
      { zoneId: 'sports-complex', distance: 140 },
      { zoneId: 'admin-block', distance: 180 }
    ],
    interactions: [
      { type: 'post', name: 'Hostel Life', description: 'Share hostel experiences' },
      { type: 'quest', name: 'Night Owl', description: 'Late night activities' }
    ],
    secrets: [{ secretId: 'rooftop-view', name: 'Rooftop Hangout', description: 'Secret rooftop spot with amazing views', reward: { xp: 50 } }],
  },
  {
    zoneId: 'girls-hostel',
    name: 'Girls Hostel',
    description: 'Safe and comfortable residence for female students.',
    type: 'residential',
    bounds: { x: 660, y: 420, width: 80, height: 60 },
    center: { x: 700, y: 450 },
    color: '#EC4899',
    icon: '🏠',
    connections: [
      { zoneId: 'cafeteria', distance: 150 }
    ],
    interactions: [
      { type: 'post', name: 'Hostel Diaries', description: 'Share hostel stories' }
    ],
  },
  {
    zoneId: 'admin-block',
    name: 'Admin Block',
    description: 'Administrative offices and main auditorium. Handle official matters here.',
    type: 'administrative',
    bounds: { x: 310, y: 350, width: 80, height: 60 },
    center: { x: 350, y: 380 },
    color: '#64748B',
    icon: '🏛️',
    connections: [
      { zoneId: 'main-gate', distance: 150 },
      { zoneId: 'sports-complex', distance: 100 },
      { zoneId: 'boys-hostel', distance: 180 }
    ],
    interactions: [
      { type: 'quest', name: 'Document Hunt', description: 'Navigate the bureaucracy' }
    ],
  },
  {
    zoneId: 'nbs',
    name: 'NBS',
    description: 'NUST Business School. For future entrepreneurs and business leaders.',
    type: 'academic',
    bounds: { x: 560, y: 350, width: 80, height: 60 },
    center: { x: 600, y: 380 },
    color: '#14B8A6',
    icon: '📊',
    connections: [
      { zoneId: 'seecs', distance: 100 },
      { zoneId: 'central-library', distance: 100 }
    ],
    interactions: [
      { type: 'post', name: 'Business Ideas', description: 'Share startup ideas' },
      { type: 'quest', name: 'Pitch Perfect', description: 'Perfect your pitch' }
    ],
  },
  {
    zoneId: 'c3a',
    name: 'C3A',
    description: 'School of Art, Design & Architecture. Where creativity meets innovation.',
    type: 'academic',
    bounds: { x: 410, y: 220, width: 80, height: 60 },
    center: { x: 450, y: 250 },
    color: '#F97316',
    icon: '🎨',
    connections: [
      { zoneId: 'central-library', distance: 100 },
      { zoneId: 'main-gate', distance: 300 }
    ],
    interactions: [
      { type: 'post', name: 'Art Corner', description: 'Share your artwork' },
      { type: 'quest', name: 'Creative Challenge', description: 'Express your creativity' },
      { type: 'minigame', name: 'Color Match', description: 'Test your color sense' }
    ],
    minigames: [{ gameId: 'color-match', name: 'Color Match', rewards: { xp: 40, points: 20 } }],
  },
];

// Quests
const questsData = [
  {
    title: 'Welcome to NUST',
    description: 'Complete your first steps on campus and begin your adventure!',
    type: 'main',
    category: 'exploration',
    objectives: [
      { description: 'Visit the Main Gate', type: 'visit_zone', target: { zone: 'main-gate' }, xpReward: 25 },
      { description: 'Explore the Library', type: 'visit_zone', target: { zone: 'central-library' }, xpReward: 25 },
      { description: 'Create your first post', type: 'create_post', target: { count: 1 }, xpReward: 50 }
    ],
    rewards: { xp: 100, points: 50, badgeId: 'badge-1' },
    isActive: true,
  },
  {
    title: 'Social Butterfly',
    description: 'Connect with the campus community and make your voice heard!',
    type: 'weekly',
    category: 'social',
    objectives: [
      { description: 'Create 5 posts', type: 'create_post', target: { count: 5 }, xpReward: 50 },
      { description: 'React to 10 posts', type: 'react', target: { count: 10 }, xpReward: 50 }
    ],
    rewards: { xp: 200, points: 100 },
    repeatable: true,
    cooldown: 604800000, // 7 days
    isActive: true,
  },
  {
    title: 'Library Explorer',
    description: 'Become a master of the library and unlock its secrets.',
    type: 'daily',
    category: 'exploration',
    objectives: [
      { description: 'Visit the Library', type: 'visit_zone', target: { zone: 'central-library' }, xpReward: 25 },
      { description: 'Play Quiz Master', type: 'play_minigame', target: { minigameId: 'quiz-master' }, xpReward: 50 }
    ],
    rewards: { xp: 75, points: 40 },
    repeatable: true,
    cooldown: 86400000, // 24 hours
    isActive: true,
  },
  {
    title: 'Tech Enthusiast',
    description: 'Explore the world of technology at SEECS and prove your coding skills.',
    type: 'main',
    category: 'academic',
    objectives: [
      { description: 'Visit SEECS', type: 'visit_zone', target: { zone: 'seecs' }, xpReward: 25 },
      { description: 'Play Debug Master', type: 'play_minigame', target: { minigameId: 'debug-master' }, xpReward: 75 },
      { description: 'Post about tech', type: 'create_post', target: { count: 1, zone: 'seecs' }, xpReward: 50 }
    ],
    rewards: { xp: 150, points: 75 },
    isActive: true,
  },
  {
    title: 'Campus Champion',
    description: 'Visit every zone on campus and become a true explorer!',
    type: 'main',
    category: 'exploration',
    objectives: [
      { description: 'Visit all 10 campus zones', type: 'visit_all_zones', target: { count: 10 }, xpReward: 200 }
    ],
    rewards: { xp: 300, points: 150, badgeId: 'badge-5' },
    isActive: true,
  },
];

// Clubs
const clubsData = [
  {
    name: 'IEEE NUST',
    description: 'Technical society for tech enthusiasts. Join us for workshops, hackathons, and networking with industry professionals!',
    shortDescription: 'Technical society for tech enthusiasts',
    category: 'technical',
    tags: ['technology', 'engineering', 'workshops', 'hackathons'],
    color: '#3B82F6',
    memberCount: 150,
    membershipType: 'open',
    meetingZone: 'seecs',
    meetingSchedule: 'Every Friday 5PM',
    isVerified: true,
    isFeatured: true,
  },
  {
    name: 'Literary Society',
    description: 'For book lovers and writers. Monthly book clubs, poetry slams, and creative writing workshops!',
    shortDescription: 'For book lovers and writers',
    category: 'cultural',
    tags: ['books', 'writing', 'poetry', 'literature'],
    color: '#8B5CF6',
    memberCount: 80,
    membershipType: 'open',
    meetingZone: 'central-library',
    meetingSchedule: 'Every Saturday 3PM',
    isVerified: true,
  },
  {
    name: 'Sports Club',
    description: 'All sports activities under one roof. Cricket, football, basketball, and more!',
    shortDescription: 'All sports activities',
    category: 'sports',
    tags: ['sports', 'football', 'cricket', 'basketball', 'fitness'],
    color: '#10B981',
    memberCount: 200,
    membershipType: 'open',
    meetingZone: 'sports-complex',
    meetingSchedule: 'Daily 4PM-7PM',
    isVerified: true,
    isFeatured: true,
  },
  {
    name: 'Art Club',
    description: 'Creative arts and design society. Painting, digital art, sculpture, and exhibitions!',
    shortDescription: 'Creative arts and design',
    category: 'arts',
    tags: ['art', 'design', 'painting', 'sculpture', 'creativity'],
    color: '#F97316',
    memberCount: 60,
    membershipType: 'open',
    meetingZone: 'c3a',
    meetingSchedule: 'Wednesdays 4PM',
    isVerified: true,
  },
];

// Users (will be created with references)
const usersData = [
  {
    email: 'test@nust.edu.pk',
    password: 'test123',
    nickname: 'NUSTExplorer',
    userType: 'explorer',
    nustId: '2024-SEECS-001',
    avatar: {
      base: 'default',
      accessories: ['glasses'],
      outfit: 'casual',
      color: '#3B82F6'
    },
    xp: 250,
    level: 3,
    points: 500,
    currentZone: 'main-gate',
    position: { x: 400, y: 500 },
    loginStreak: 5,
    preferences: {
      showOnMap: true,
      defaultMode: 'game',
      notifications: { email: true, push: true }
    },
    role: 'student',
    verification: { isVerified: true, status: 'verified' },
  },
  {
    email: 'ali@nust.edu.pk',
    password: 'test123',
    nickname: 'AliKhan',
    userType: 'explorer',
    nustId: '2024-SEECS-002',
    avatar: {
      base: 'default',
      accessories: [],
      outfit: 'sporty',
      color: '#EF4444'
    },
    xp: 180,
    level: 2,
    points: 350,
    currentZone: 'seecs',
    position: { x: 600, y: 400 },
    loginStreak: 3,
    preferences: {
      showOnMap: true,
      defaultMode: 'game',
      notifications: { email: true, push: true }
    },
    role: 'student',
    verification: { isVerified: true, status: 'verified' },
  },
  {
    email: 'fatima@nust.edu.pk',
    password: 'test123',
    nickname: 'FatimaA',
    userType: 'explorer',
    nustId: '2024-NBS-001',
    avatar: {
      base: 'default',
      accessories: ['cap'],
      outfit: 'casual',
      color: '#8B5CF6'
    },
    xp: 320,
    level: 4,
    points: 720,
    currentZone: 'nbs',
    position: { x: 800, y: 600 },
    loginStreak: 7,
    preferences: {
      showOnMap: true,
      defaultMode: 'portal',
      notifications: { email: true, push: true }
    },
    role: 'student',
    verification: { isVerified: true, status: 'verified' },
  },
];

// Posts (will be created with user references)
const postsData = [
  {
    content: 'Just found a secret spot in the library! 📚 Perfect for studying without distractions.',
    isAnonymous: true,
    displayName: 'BookwormExplorer',
    location: { zone: 'central-library', name: 'Central Library' },
    type: 'general',
    tags: ['study', 'library', 'secret'],
  },
  {
    content: 'Who else is excited for the upcoming tech fest? 🎉 Heard there are amazing prizes!',
    isAnonymous: true,
    displayName: 'TechEnthusiast',
    location: { zone: 'seecs', name: 'SEECS' },
    type: 'general',
    tags: ['techfest', 'competition', 'prizes'],
  },
  {
    content: 'The cafeteria biryani today was actually good! 🍚 A rare occurrence lol',
    isAnonymous: true,
    displayName: 'FoodCritic',
    location: { zone: 'cafeteria', name: 'Cafeteria' },
    type: 'general',
    tags: ['food', 'cafeteria', 'biryani'],
  },
  {
    content: 'Late night coding session at SEECS. Anyone else here? 💻☕',
    isAnonymous: true,
    displayName: 'NightOwlCoder',
    location: { zone: 'seecs', name: 'SEECS' },
    type: 'general',
    tags: ['coding', 'latenight', 'seecs'],
  },
];

// Events
const eventsData = [
  {
    title: 'Tech Fest 2024',
    description: 'Annual technology festival with coding competitions, hackathons, and workshops. Great prizes to be won!',
    startDate: new Date(Date.now() + 86400000 * 3),
    endDate: new Date(Date.now() + 86400000 * 4),
    location: { zone: 'seecs', name: 'SEECS', venue: 'Main Auditorium' },
    type: 'competition',
    rewards: { xp: 500, points: 250 },
    maxParticipants: 200,
    status: 'upcoming',
    tags: ['tech', 'hackathon', 'competition'],
  },
  {
    title: 'Book Club Meeting',
    description: 'Monthly book discussion - This month: "1984" by George Orwell. All book lovers welcome!',
    startDate: new Date(Date.now() + 86400000),
    endDate: new Date(Date.now() + 86400000 + 7200000),
    location: { zone: 'central-library', name: 'Central Library', venue: 'Reading Room' },
    type: 'social',
    rewards: { xp: 100, points: 50 },
    maxParticipants: 30,
    status: 'upcoming',
    tags: ['books', 'discussion', 'social'],
  },
  {
    title: 'Football Tournament',
    description: 'Inter-department football tournament. Form your teams and compete!',
    startDate: new Date(Date.now() + 86400000 * 5),
    endDate: new Date(Date.now() + 86400000 * 7),
    location: { zone: 'sports-complex', name: 'Sports Complex', venue: 'Football Ground' },
    type: 'sports',
    rewards: { xp: 300, points: 150 },
    maxParticipants: 100,
    status: 'upcoming',
    tags: ['sports', 'football', 'tournament'],
  },
  {
    title: 'Art Exhibition',
    description: 'Student art showcase featuring paintings, sculptures, and digital art.',
    startDate: new Date(Date.now() + 86400000 * 2),
    endDate: new Date(Date.now() + 86400000 * 3),
    location: { zone: 'c3a', name: 'C3A', venue: 'Art Gallery' },
    type: 'cultural',
    rewards: { xp: 150, points: 75 },
    maxParticipants: 50,
    status: 'upcoming',
    tags: ['art', 'exhibition', 'creativity'],
  },
];

// ============ SEED FUNCTIONS ============

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Event.deleteMany({}),
    Zone.deleteMany({}),
    Quest.deleteMany({}),
    Badge.deleteMany({}),
    Item.deleteMany({}),
    Club.deleteMany({}),
  ]);
  console.log('✅ Database cleared');
}

async function seedBadges() {
  console.log('🏆 Seeding badges...');
  const badges = await Badge.insertMany(badgesData);
  console.log(`✅ Created ${badges.length} badges`);
  return badges;
}

async function seedItems() {
  console.log('🎁 Seeding items...');
  const items = await Item.insertMany(itemsData);
  console.log(`✅ Created ${items.length} items`);
  return items;
}

async function seedZones() {
  console.log('🗺️  Seeding zones...');
  const zones = await Zone.insertMany(zonesData);
  console.log(`✅ Created ${zones.length} zones`);
  return zones;
}

async function seedQuests() {
  console.log('📜 Seeding quests...');
  const quests = await Quest.insertMany(questsData);
  console.log(`✅ Created ${quests.length} quests`);
  return quests;
}

async function seedClubs() {
  console.log('👥 Seeding clubs...');
  const clubs = await Club.insertMany(clubsData);
  console.log(`✅ Created ${clubs.length} clubs`);
  return clubs;
}

async function seedUsers(badges, clubs) {
  console.log('👤 Seeding users...');
  
  const users = [];
  for (const userData of usersData) {
    // Get badge references
    const userBadges = badges.slice(0, userData.email === 'fatima@nust.edu.pk' ? 3 : userData.email === 'test@nust.edu.pk' ? 2 : 1).map(b => b._id);
    
    // Get club references
    const userClubs = [];
    if (userData.email === 'test@nust.edu.pk') {
      userClubs.push(clubs.find(c => c.name === 'IEEE NUST')?._id);
    } else if (userData.email === 'ali@nust.edu.pk') {
      userClubs.push(clubs.find(c => c.name === 'Sports Club')?._id);
    } else {
      userClubs.push(clubs.find(c => c.name === 'IEEE NUST')?._id);
      userClubs.push(clubs.find(c => c.name === 'Literary Society')?._id);
    }
    
    // Pass plaintext password - User model's pre-save hook will hash it
    const user = await User.create({
      ...userData,
      badges: userBadges.filter(Boolean),
      clubs: userClubs.filter(Boolean),
    });
    users.push(user);
  }
  
  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function seedPosts(users) {
  console.log('📝 Seeding posts...');
  
  // Use the first user as author for system posts
  const systemUser = users[0];
  
  const posts = [];
  for (let i = 0; i < postsData.length; i++) {
    const postData = postsData[i];
    
    // Add some reactions and comments
    const reactions = [
      { type: 'like', user: users[0]._id },
      { type: 'like', user: users[1]._id },
    ];
    if (i === 0) {
      reactions.push({ type: 'love', user: users[2]._id });
    }
    
    const comments = i === 0 || i === 2 ? [{
      content: i === 0 ? 'Share the location please!' : 'No way, I need to try it!',
      displayName: i === 0 ? 'CuriousStudent' : 'HungryStudent',
      isAnonymous: true,
    }] : [];
    
    const post = await Post.create({
      ...postData,
      author: systemUser._id,
      reactions,
      comments,
      createdAt: new Date(Date.now() - i * 3600000), // Stagger creation times
    });
    posts.push(post);
  }
  
  console.log(`✅ Created ${posts.length} posts`);
  return posts;
}

async function seedEvents(users, clubs) {
  console.log('📅 Seeding events...');
  
  const events = [];
  for (let i = 0; i < eventsData.length; i++) {
    const eventData = eventsData[i];
    
    // Assign organizer based on event type
    let organizer = users[0]._id;
    let clubOrganizer = null;
    
    if (eventData.type === 'sports') {
      clubOrganizer = clubs.find(c => c.name === 'Sports Club')?._id;
    } else if (eventData.title.includes('Tech')) {
      clubOrganizer = clubs.find(c => c.name === 'IEEE NUST')?._id;
    } else if (eventData.title.includes('Book')) {
      clubOrganizer = clubs.find(c => c.name === 'Literary Society')?._id;
    } else if (eventData.title.includes('Art')) {
      clubOrganizer = clubs.find(c => c.name === 'Art Club')?._id;
    }
    
    const event = await Event.create({
      ...eventData,
      organizer,
      clubOrganizer,
    });
    events.push(event);
  }
  
  console.log(`✅ Created ${events.length} events`);
  return events;
}

// ============ MAIN SEED FUNCTION ============

async function seed() {
  try {
    console.log('🌱 Starting database seed...\n');
    console.log(`📡 Connecting to MongoDB...`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Clear existing data
    await clearDatabase();
    console.log('');
    
    // Seed in order (respecting dependencies)
    const badges = await seedBadges();
    const items = await seedItems();
    const zones = await seedZones();
    const quests = await seedQuests();
    const clubs = await seedClubs();
    const users = await seedUsers(badges, clubs);
    const posts = await seedPosts(users);
    const events = await seedEvents(users, clubs);
    
    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${badges.length} badges`);
    console.log(`   - ${items.length} items`);
    console.log(`   - ${zones.length} zones`);
    console.log(`   - ${quests.length} quests`);
    console.log(`   - ${clubs.length} clubs`);
    console.log(`   - ${users.length} users`);
    console.log(`   - ${posts.length} posts`);
    console.log(`   - ${events.length} events`);
    
    console.log('\n📧 Test Users:');
    console.log('   - test@nust.edu.pk / test123');
    console.log('   - ali@nust.edu.pk / test123');
    console.log('   - fatima@nust.edu.pk / test123');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run seed
seed();
