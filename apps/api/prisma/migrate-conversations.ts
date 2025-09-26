import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateConversations() {
  console.log('🔄 Starting conversation migration...')

  // Get the admin user
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@parle.local' }
  })

  if (!adminUser) {
    console.error('❌ Admin user not found! Please run the seed script first.')
    process.exit(1)
  }

  console.log('✅ Found admin user:', adminUser.username)

  // Find conversations without userId
  const orphanedConversations = await prisma.conversation.findMany({
    where: {
      userId: null
    }
  })

  console.log(`📊 Found ${orphanedConversations.length} conversations without userId`)

  if (orphanedConversations.length > 0) {
    // Assign all orphaned conversations to admin user
    const updateResult = await prisma.conversation.updateMany({
      where: {
        userId: null
      },
      data: {
        userId: adminUser.id
      }
    })

    console.log(`✅ Assigned ${updateResult.count} conversations to admin user`)
  }

  // Verify the migration
  const totalConversations = await prisma.conversation.count()
  const adminConversations = await prisma.conversation.count({
    where: { userId: adminUser.id }
  })

  console.log(`📊 Migration summary:`)
  console.log(`   Total conversations: ${totalConversations}`)
  console.log(`   Admin conversations: ${adminConversations}`)
  console.log(`   Orphaned conversations: ${totalConversations - adminConversations}`)

  console.log('✅ Migration completed successfully!')
}

migrateConversations()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Migration failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })