import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminHashedPassword = await bcrypt.hash('admin123', 10)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@parle.local' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@parle.local',
      password: adminHashedPassword,
      role: 'admin',
      plan: 'paid',
    },
  })

  console.log('✅ Admin user created:', adminUser)

  // Create test member user
  const memberHashedPassword = await bcrypt.hash('test123', 10)

  const memberUser = await prisma.user.upsert({
    where: { email: 'test@parle.local' },
    update: {},
    create: {
      username: 'test',
      email: 'test@parle.local',
      password: memberHashedPassword,
      role: 'member',
      plan: 'free',
    },
  })

  console.log('✅ Member user created:', memberUser)

  console.log('🎉 Seeding completed!')
  console.log('📝 Login credentials:')
  console.log('   Admin: admin / admin123')
  console.log('   Test User: test / test123')
}

// this script only works with bun, so we need to call it like this
// to work with tsx we need to wrap it in a IIFE function (async () => { ... })()
try {
  await main()
  await prisma.$disconnect()
} catch (e) {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
}
