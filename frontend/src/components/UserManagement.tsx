import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const UserManagement: React.FC = () => {
  const { token, users, fetchUsers, currentUser } = useDashboard();
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  
  // Edit State
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // UI State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const API_BASE = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:8001/api' : '/api');

  const handleCancelEdit = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('employee');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleEditClick = (u: any) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword(''); // keep blank unless resetting
    setRole(u.role);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim() || !email.trim() || !role) {
      setErrorMsg('Name, email, and role are required fields.');
      return;
    }

    if (!editingUser && !password.trim()) {
      setErrorMsg('Password is required for new accounts.');
      return;
    }

    if (password && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const url = editingUser 
        ? `${API_BASE}/users/${editingUser.id}/admin-edit`
        : `${API_BASE}/users`;
      
      const method = editingUser ? 'PUT' : 'POST';

      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        role
      };

      if (password.trim()) {
        payload.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (editingUser) {
          setSuccessMsg(`User "${name}" updated successfully!`);
          handleCancelEdit();
        } else {
          setSuccessMsg(`User "${name}" created successfully as ${role}!`);
          setName('');
          setEmail('');
          setPassword('');
          setRole('employee');
        }
        fetchUsers(); // Refresh the list
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || 'Failed to submit request.');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (u: any) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (u.id === currentUser?.id) {
      setErrorMsg('You cannot delete your own account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user "${u.name}" (${u.email})?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${u.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setSuccessMsg(`User "${u.name}" deleted successfully.`);
        if (editingUser?.id === u.id) {
          handleCancelEdit();
        }
        fetchUsers(); // Refresh the list
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || 'Failed to delete user.');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter users to show only Admin, Employee, and Super-admin roles
  const managedUsers = users.filter((u) => {
    const matchesRole = u.role === 'admin' || u.role === 'employee' || u.role === 'super-admin';
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-xl">
      {/* Header */}
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">User Management</h1>
        <p className="font-body-md text-on-surface-variant">
          Create, edit, and delete system credentials for administrators and employees.
        </p>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
        {/* Left Column: Users List Table */}
        <div className="lg:col-span-2 space-y-md">
          <div className="flex justify-between items-center bg-surface-container-high/40 p-md rounded-xl border border-outline-variant/60">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search staff users..."
                className="w-full bg-surface-container-high border border-outline-variant text-on-surface pl-xl pr-md py-sm rounded-lg focus:outline-none focus:border-primary text-body-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
            </div>
            <span className="text-[12px] font-mono-code text-outline-variant ml-md">
              Total Accounts: {managedUsers.length}
            </span>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high border-b border-outline-variant font-label-sm text-label-sm text-outline uppercase tracking-wider">
                    <th className="py-md px-lg">Name</th>
                    <th className="py-md px-lg">Email (Username)</th>
                    <th className="py-md px-lg">Role</th>
                    <th className="py-md px-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {managedUsers.map((u) => (
                    <tr key={u.id} className={`hover:bg-surface-variant/10 transition-colors ${editingUser?.id === u.id ? 'bg-primary/10' : ''}`}>
                      <td className="py-md px-lg font-bold text-on-surface">{u.name}</td>
                      <td className="py-md px-lg font-mono-code text-on-surface-variant">{u.email}</td>
                      <td className="py-md px-lg">
                        <span
                          className={`px-sm py-[2px] text-[10px] font-bold uppercase tracking-wider rounded border ${
                            u.role === 'super-admin'
                              ? 'bg-purple-600/10 text-purple-400 border-purple-500/30'
                              : u.role === 'admin'
                              ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                              : 'bg-green-600/10 text-green-400 border-green-500/30'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-md px-lg text-right">
                        <div className="flex items-center justify-end gap-xs">
                          <button
                            type="button"
                            onClick={() => handleEditClick(u)}
                            className="p-xs text-primary hover:bg-primary/20 rounded cursor-pointer material-symbols-outlined text-[18px]"
                            title="Edit User"
                          >
                            edit
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-xs text-error hover:bg-error/20 rounded cursor-pointer material-symbols-outlined text-[18px]"
                              title="Delete User"
                            >
                              delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Creation / Edit Form */}
        <div className="lg:col-span-1">
          <div className="glass-card p-lg rounded-xl border border-primary/30 space-y-lg">
            <div>
              <h2 className="font-headline-sm font-bold text-on-surface">
                {editingUser ? 'Edit User Credentials' : 'Create User Credentials'}
              </h2>
              <p className="text-on-surface-variant text-body-sm mt-xs">
                {editingUser 
                  ? `Modifying credentials for "${editingUser.name}".`
                  : 'Provision a new administrator or employee account immediately.'}
              </p>
            </div>

            {errorMsg && (
              <div className="bg-error/15 border border-error/30 text-error p-md rounded text-body-sm font-medium">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-green-600/15 border border-green-500/30 text-green-400 p-md rounded text-body-sm font-medium">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleCreateOrUpdateUser} className="space-y-md">
              <div className="space-y-xs">
                <label className="font-label-sm text-outline">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant text-on-surface px-md py-sm rounded-lg focus:outline-none focus:border-primary text-body-sm"
                  required
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-outline">Email Address (Username)</label>
                <input
                  type="email"
                  placeholder="e.g. jane.smith@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant text-on-surface px-md py-sm rounded-lg focus:outline-none focus:border-primary text-body-sm"
                  required
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-outline">
                  Password {editingUser && <span className="text-[10px] text-outline-variant font-normal">(Leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? 'Unchanged' : 'Minimum 6 characters'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant text-on-surface px-md py-sm rounded-lg focus:outline-none focus:border-primary text-body-sm"
                  required={!editingUser}
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-outline">Assign Role</label>
                <select
                  value={role}
                  disabled={editingUser?.id === currentUser?.id}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant text-on-surface px-md py-sm rounded-lg focus:outline-none focus:border-primary text-body-sm cursor-pointer disabled:opacity-50"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                  {editingUser?.role === 'super-admin' && <option value="super-admin">Super Admin</option>}
                </select>
              </div>

              <div className="flex flex-col gap-sm pt-sm">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-md bg-primary hover:opacity-90 disabled:opacity-50 text-on-primary font-bold text-label-md rounded-lg shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-xs cursor-pointer uppercase"
                >
                  {loading ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        {editingUser ? 'save' : 'person_add'}
                      </span>
                      <span>{editingUser ? 'Save Changes' : 'Create User'}</span>
                    </>
                  )}
                </button>

                {editingUser && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full py-md bg-surface-container-high border border-outline hover:bg-surface-variant text-on-surface font-bold text-label-md rounded-lg transition-all flex items-center justify-center gap-xs cursor-pointer uppercase"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    <span>Cancel Edit</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
