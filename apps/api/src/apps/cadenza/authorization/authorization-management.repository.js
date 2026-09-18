import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const findModuleById=(id)=>prisma.authorizationModule.findUnique({where:{id},include:{permissions:true}})
const findModuleByKey=(key)=>prisma.authorizationModule.findUnique({where:{key}})
const listModules=()=>prisma.authorizationModule.findMany({include:{permissions:true},orderBy:{key:'asc'}})
const createModule=(data)=>prisma.authorizationModule.create({data,include:{permissions:true}})
const createPermission=(data)=>prisma.authorizationPermission.create({data})
const setModuleActive=(id,isActive)=>prisma.authorizationModule.update({where:{id},data:{isActive},include:{permissions:true}})
const listRoleIdsByModuleId=(moduleId)=>prisma.rolePermission.findMany({where:{permission:{moduleId}},select:{roleId:true},distinct:['roleId']})
const findMembershipById=(id,appId)=>prisma.appMembership.findFirst({where:{id,appId}})
const createRole=(data)=>prisma.role.create({data,include:{permissions:{include:{permission:{include:{module:true}}}}}})
const findRoleForApp=(id,appId)=>prisma.role.findFirst({where:{id,appId}})
const findRoleById=(id,appId)=>prisma.role.findFirst({where:{id,appId},include:{permissions:{include:{permission:{include:{module:true}}}}}})
const findPermissionById=(id)=>prisma.authorizationPermission.findUnique({where:{id},include:{module:true}})
const replaceRolePermissions=async(roleId,appId,permissionIds)=>{const role=await findRoleForApp(roleId,appId);if(!role)return null;const valid=await prisma.authorizationPermission.count({where:{id:{in:permissionIds},module:{key:{startsWith:'cadenza_'}}}});if(valid!==permissionIds.length)return undefined;await prisma.$transaction([prisma.rolePermission.deleteMany({where:{roleId}}),...permissionIds.map(permissionId=>prisma.rolePermission.create({data:{roleId,permissionId}}))]);return findRoleById(roleId,appId)}
const listRoles=(appId)=>prisma.role.findMany({where:{appId},include:{permissions:{include:{permission:{include:{module:true}}}}},orderBy:{name:'asc'}})
const listMembershipRoles=(membershipId,appId)=>prisma.role.findMany({where:{appId,membershipId},include:{permissions:{include:{permission:{include:{module:true}}}}},orderBy:{name:'asc'}})
const replaceMembershipRoles=async(membershipId,appId,roleIds)=>{const m=await findMembershipById(membershipId,appId);if(!m)return null;const valid=await prisma.role.count({where:{id:{in:roleIds},appId}});if(valid!==roleIds.length)return undefined;await prisma.role.updateMany({where:{membershipId,appId},data:{membershipId:null}});if(roleIds.length)await prisma.role.updateMany({where:{id:{in:roleIds},appId},data:{membershipId}});return listMembershipRoles(membershipId,appId)}
export {findModuleById,findModuleByKey,listModules,createModule,createPermission,setModuleActive,listRoleIdsByModuleId,findMembershipById,createRole,findRoleForApp,findRoleById,findPermissionById,replaceRolePermissions,listRoles,listMembershipRoles,replaceMembershipRoles}
