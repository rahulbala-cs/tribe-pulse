import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MOOD_LABELS = ['Burned Out', 'Stressed', 'Neutral', 'Happy', 'Thriving']
const REASON_CATEGORIES = [
	'Workload', 'Team Dynamics', 'Management', 'Growth',
	'Recognition', 'Work-Life Balance', 'Company Culture', 'Personal',
]
const LOCATIONS = ['Bangalore', 'Mumbai', 'Remote-India', 'Singapore']

const DEPARTMENTS: Record<string, string[]> = {
	Engineering: ['Platform', 'Frontend', 'Backend', 'Mobile'],
	Product: ['Design', 'PM'],
	Operations: ['HR', 'Finance'],
}

const FREE_TEXT_BY_MOOD: Record<number, string[]> = {
	1: [
		'Feeling completely drained after back-to-back deadlines',
		'Too many meetings, no time to focus on actual work',
		'Exhausted from the constant firefighting',
		'Need a break urgently, been working weekends',
		'Overwhelmed with the amount of context switching',
		'',
	],
	2: [
		'Deadline pressure is getting to me',
		'Struggling with unclear requirements',
		'Team communication could be better',
		'Workload has been heavy this week',
		'Frustrated with the deployment process',
		'Feeling a bit isolated working remotely',
		'',
	],
	3: [
		'Just an average day, nothing special',
		'Things are okay, could be better',
		'Steady progress on my tasks',
		'',
		'',
	],
	4: [
		'Had a productive day, shipped a feature',
		'Great 1:1 with my manager today',
		'Enjoyed collaborating with the team',
		'Learning new things on this project',
		'Got positive feedback on my PR',
		'',
	],
	5: [
		'Absolutely loving the new project!',
		'Got promoted! Feeling appreciated',
		'Team offsite was amazing, feeling recharged',
		'Shipped a major feature, team celebrated',
		'Feeling really supported by leadership',
		'',
	],
}

const FIRST_NAMES = [
	'Aarav', 'Aditi', 'Aisha', 'Amit', 'Ananya', 'Arjun', 'Bhavya', 'Chandra',
	'Deepa', 'Dev', 'Divya', 'Esha', 'Farhan', 'Gauri', 'Harsh', 'Isha',
	'Jai', 'Kavya', 'Kiran', 'Lakshmi', 'Manish', 'Maya', 'Neeraj', 'Nisha',
	'Om', 'Pallavi', 'Priya', 'Raj', 'Ravi', 'Rhea', 'Rohan', 'Sakshi',
	'Sameer', 'Sanya', 'Shreya', 'Siddharth', 'Sneha', 'Suresh', 'Tanvi', 'Varun',
	'Vikram', 'Vivek', 'Yash', 'Zara', 'Arun', 'Meera', 'Nikhil', 'Pooja',
	'Rahul', 'Sonia', 'Tarun', 'Uma', 'Vinay', 'Neha', 'Akash', 'Simran',
]

const LAST_NAMES = [
	'Sharma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Nair', 'Gupta', 'Joshi',
	'Mehta', 'Shah', 'Rao', 'Das', 'Iyer', 'Chopra', 'Malhotra', 'Bhat',
	'Pillai', 'Verma', 'Agarwal', 'Banerjee', 'Desai', 'Fernandes', 'Gill',
	'Hegde', 'Iyengar', 'Kaur', 'Menon', 'Pandey', 'Saxena', 'Thakur',
]

function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]
}

function weightedMood(
	baseMood: number,
	dayOfWeek: number,
	weekNum: number,
	teamName: string,
	isLowMoodEmployee: boolean,
): number {
	let mood = baseMood

	// Monday dip
	if (dayOfWeek === 1) mood -= 0.7
	// Friday boost
	if (dayOfWeek === 5) mood += 0.3

	// Engineering post-release stress in week 3
	if (['Platform', 'Frontend', 'Backend', 'Mobile'].includes(teamName) && weekNum === 3) {
		mood -= 0.8
	}

	// Product team improvement after recognition event in week 2
	if (['Design', 'PM'].includes(teamName) && weekNum >= 2) {
		mood += 0.4
	}

	// Sustained low mood employees
	if (isLowMoodEmployee) {
		mood -= 1.2
	}

	// Add some randomness
	mood += (Math.random() - 0.5) * 1.5

	return Math.max(1, Math.min(5, Math.round(mood)))
}

function reasonsForMood(mood: number, teamName: string, location: string): string[] {
	const reasons: string[] = []
	const count = mood <= 2 ? pick([1, 2, 3]) : pick([1, 2])

	const weights: Record<string, number> = {
		'Workload': ['Platform', 'Frontend', 'Backend', 'Mobile'].includes(teamName) ? 5 : 2,
		'Team Dynamics': 3,
		'Management': mood <= 2 ? 3 : 1,
		'Growth': ['Design', 'PM'].includes(teamName) ? 4 : 2,
		'Recognition': mood >= 4 ? 4 : 1,
		'Work-Life Balance': location === 'Remote-India' ? 4 : 2,
		'Company Culture': 2,
		'Personal': 1,
	}

	const pool = Object.entries(weights).flatMap(([cat, w]) =>
		Array(w).fill(cat) as string[]
	)

	const chosen = new Set<string>()
	while (chosen.size < count) {
		chosen.add(pick(pool))
	}
	return [...chosen]
}

async function main() {
	console.log('Cleaning database...')
	await prisma.moodReason.deleteMany()
	await prisma.moodEntry.deleteMany()
	await prisma.employee.deleteMany()
	await prisma.team.deleteMany()
	await prisma.department.deleteMany()
	await prisma.organization.deleteMany()
	await prisma.orgEvent.deleteMany()

	console.log('Creating organization...')
	const org = await prisma.organization.create({
		data: { name: 'TechCorp India' },
	})

	console.log('Creating departments and teams...')
	const teamMap: Record<string, string> = {}
	for (const [deptName, teams] of Object.entries(DEPARTMENTS)) {
		const dept = await prisma.department.create({
			data: { name: deptName, organizationId: org.id },
		})
		for (const teamName of teams) {
			const team = await prisma.team.create({
				data: { name: teamName, departmentId: dept.id },
			})
			teamMap[teamName] = team.id
		}
	}

	console.log('Creating employees...')
	const allTeamNames = Object.keys(teamMap)
	const employees: { id: string; teamName: string; location: string; isLowMood: boolean }[] = []
	const usedNames = new Set<string>()
	const targetCount = 210

	for (let i = 0; i < targetCount; i++) {
		let fullName: string
		do {
			fullName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
		} while (usedNames.has(fullName))
		usedNames.add(fullName)

		const teamName = allTeamNames[i % allTeamNames.length]
		const location = LOCATIONS[i % LOCATIONS.length]
		const isLowMood = i < 4

		const emp = await prisma.employee.create({
			data: {
				name: fullName,
				email: `${fullName.toLowerCase().replace(' ', '.')}@techcorp.com`,
				slackUserId: `U${String(i + 1).padStart(8, '0')}`,
				location,
				teamId: teamMap[teamName],
				isAnonymousDefault: Math.random() > 0.8,
			},
		})
		employees.push({ id: emp.id, teamName, location, isLowMood })
	}
	console.log(`Created ${employees.length} employees`)

	console.log('Creating 30 days of mood entries...')
	const today = new Date()
	let entryCount = 0

	for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
		const date = new Date(today)
		date.setDate(date.getDate() - dayOffset)
		date.setHours(18, 0, 0, 0)

		const dayOfWeek = date.getDay()
		if (dayOfWeek === 0 || dayOfWeek === 6) continue

		const weekNum = Math.ceil((30 - dayOffset) / 7)
		const participationRate = 0.7 + Math.random() * 0.2

		for (const emp of employees) {
			if (Math.random() > participationRate) continue

			const baseMood = 3.5
			const mood = weightedMood(baseMood, dayOfWeek, weekNum, emp.teamName, emp.isLowMood)
			const reasons = reasonsForMood(mood, emp.teamName, emp.location)
			const freeTexts = FREE_TEXT_BY_MOOD[mood] || FREE_TEXT_BY_MOOD[3]
			const freeText = pick(freeTexts) || null

			const entryDate = new Date(date)
			entryDate.setHours(18 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60))

			await prisma.moodEntry.create({
				data: {
					employeeId: emp.id,
					moodLevel: mood,
					moodLabel: MOOD_LABELS[mood - 1],
					freeText,
					isAnonymous: Math.random() > 0.7,
					sentiment: freeText ? (mood - 3) / 2 + (Math.random() - 0.5) * 0.3 : null,
					createdAt: entryDate,
					reasons: {
						create: reasons.map(cat => ({ category: cat })),
					},
				},
			})
			entryCount++
		}
	}
	console.log(`Created ${entryCount} mood entries`)

	console.log('Creating org events...')
	const events = [
		{ name: 'Q1 Planning Kickoff', description: 'Annual planning and goal setting', daysAgo: 28 },
		{ name: 'Product Launch v3.0', description: 'Major product release', daysAgo: 21 },
		{ name: 'Team Recognition Day', description: 'Company-wide recognition awards', daysAgo: 14 },
		{ name: 'Q3 Reorg Announcement', description: 'Organizational restructuring', daysAgo: 10 },
		{ name: 'Company Offsite', description: 'Annual company retreat', daysAgo: 5 },
		{ name: 'Hackathon Week', description: 'Internal innovation hackathon', daysAgo: 2 },
	]
	for (const evt of events) {
		const evtDate = new Date(today)
		evtDate.setDate(evtDate.getDate() - evt.daysAgo)
		await prisma.orgEvent.create({
			data: { name: evt.name, description: evt.description, date: evtDate },
		})
	}

	console.log('Seed complete!')
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect())
