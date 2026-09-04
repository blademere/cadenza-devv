import { describe, expect, it } from 'vitest'
import { getAdministrationActions } from '../../../src/pages/dashboard.utils.js'
import { permissions } from '../../../src/config/permissions.js'

describe('dashboard administration actions', () => {
  it('shows no administration actions without management permissions', () => {
    expect(getAdministrationActions({
      canManageUsers: false,
      canManageAuthorization: false,
    })).toEqual([])
  })

  it('maps users permission to the users route only', () => {
    expect(getAdministrationActions({
      canManageUsers: true,
      canManageAuthorization: false,
    })).toEqual([{
      key: 'users',
      label: 'Users',
      route: '/app/users',
      permission: permissions.users.manage,
    }])
  })

  it('maps authorization permission to the roles route only', () => {
    expect(getAdministrationActions({
      canManageUsers: false,
      canManageAuthorization: true,
    })).toEqual([{
      key: 'roles',
      label: 'Roles & permissions',
      route: '/app/roles',
      permission: permissions.authorization.manage,
    }])
  })

  it('exposes both independent administration actions when both permissions exist', () => {
    expect(getAdministrationActions({
      canManageUsers: true,
      canManageAuthorization: true,
    }).map(({ key, route }) => ({ key, route }))).toEqual([
      { key: 'users', route: '/app/users' },
      { key: 'roles', route: '/app/roles' },
    ])
  })
})
