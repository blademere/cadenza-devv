import {
  ConflictError,
  NotFoundError,
} from '../../common/errors/appError.js'
import {
  findUser,
} from '../users/user.repository.js'
import { toUserResponse } from '../users/user.mapper.js'
import * as peopleService from '../people/people.service.js'
import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const getCadenzaEnrollmentState = async (userId) => {
  const customer = await prisma.cadenzaCustomer.findFirst({
    where: { person: { userId: Number(userId) }, app: { key: 'cadenza-client' } },
    select: {
      enrollments: {
        where: { status: { notIn: ['CANCELLED', 'COMPLETED'] } },
        select: { id: true },
      },
    },
  })
  return {
    hasActiveEnrollment: Boolean(customer?.enrollments?.length),
    activeEnrollmentCount: customer?.enrollments?.length || 0,
  }
}

const getUser = async (userId) => {
  const user = await findUser(Number(userId))
  if (!user) throw new NotFoundError('User not found.')
  return user
}

const getMyProfile = async (userId) => {
  const user = await getUser(userId)
  const person = await peopleService.getByUserId(userId)
  return { user: toUserResponse({ ...user, roles: [] }), person, ...(await getCadenzaEnrollmentState(userId)) }
}

const createMyProfile = async (userId, data) => {
  const user = await getUser(userId)
  const existingPerson = await peopleService.getByUserId(userId).catch((error) => {
    if (error instanceof NotFoundError) return null
    throw error
  })
  if (existingPerson) throw new ConflictError('Profile already exists.')

  const { age, gender, guardianName, ...personData } = data
  const person = await peopleService.create({
    ...personData,
    userId,
    metadata: {
      studentDetails: { age: age ?? null, gender: gender ?? null, guardianName: guardianName ?? null },
    },
  })
  return { user: toUserResponse({ ...user, roles: [] }), person }
}

const updateMyProfile = async (userId, data) => {
  const user = await getUser(userId)
  const person = await peopleService.getByUserId(userId)
  const enrollmentState = await getCadenzaEnrollmentState(userId)
  if (enrollmentState.hasActiveEnrollment) {
    throw new ConflictError('Your student profile cannot be changed while you have an active enrollment.')
  }

  const { age, gender, guardianName, ...personData } = data
  const existingStudentDetails = person.metadata?.studentDetails && typeof person.metadata.studentDetails === 'object'
    ? person.metadata.studentDetails
    : {}
  const updatedPerson = await peopleService.update(person.id, {
    ...personData,
    metadata: {
      ...(person.metadata || {}),
      studentDetails: {
        ...existingStudentDetails,
        age: age ?? null,
        gender: gender ?? null,
        guardianName: guardianName ?? null,
      },
    },
  })
  return { user: toUserResponse({ ...user, roles: [] }), person: updatedPerson, ...enrollmentState }
}

export {
  getMyProfile,
  createMyProfile,
  updateMyProfile,
}

export default {
  getMyProfile,
  createMyProfile,
  updateMyProfile,
}
