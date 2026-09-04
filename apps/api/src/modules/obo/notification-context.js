const buildNotificationContext = (person) => ({
  clientUserId: person?.userId || null,
  clientEmail: person?.user?.email || person?.email || null,
})

const getNotificationContext = async ({ personId, db, findPersonNotificationContext }) => {
  const person = await findPersonNotificationContext(personId, db)
  return buildNotificationContext(person)
}

export { buildNotificationContext, getNotificationContext }
