import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Gagal memuat data pengguna' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      if (editingId) {
        await api.put('/users/' + editingId, formData);
        setMessage({ type: 'success', text: 'Pengguna berhasil diperbarui!' });
      } else {
        await api.post('/users', formData);
        setMessage({ type: 'success', text: 'Pengguna berhasil ditambahkan!' });
      }
      setShowForm(false);
      setFormData({ username: '', email: '', password: '', role: 'user' });
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Gagal menyimpan pengguna' });
    }
  };

  const handleEdit = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (id === 1) {
      alert('Tidak dapat menghapus admin utama!');
      return;
    }
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return;

    try {
      await api.delete('/users/' + id);
      setMessage({ type: 'success', text: 'Pengguna berhasil dihapus!' });
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Gagal menghapus pengguna' });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ username: '', email: '', password: '', role: 'user' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Memuat pengguna...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-400 mt-1">Kelola akun pengguna sistem</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Tambah Pengguna
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="card">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            {editingId ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-field">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-field">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder={editingId ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                required={!editingId}
                minLength={6}
              />
            </div>
            <div>
              <label className="label-field">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input-field"
              >
                <option value="user">User (Pembudidaya)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">
                {editingId ? 'Update' : 'Simpan'}
              </button>
              <button type="button" className="btn-outline" onClick={handleCancel}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="text-base font-bold text-slate-800 mb-4">
          Daftar Pengguna
          <span className="text-sm font-normal text-slate-400 ml-2">({users.length} pengguna)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Tanggal Dibuat</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    <p>Belum ada pengguna.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">#{user.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{user.username}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{user.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(user.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          title="Edit"
                          className="btn-icon btn-icon-edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          title="Hapus"
                          className="btn-icon btn-icon-delete"
                          disabled={user.id === 1}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
