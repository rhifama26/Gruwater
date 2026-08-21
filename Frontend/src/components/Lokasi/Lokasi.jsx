import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Lokasi = () => {
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState({ nama_lokasi: '', keterangan: '' });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await api.get('/lokasi');
      setLocations(response.data.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (editingId) {
        await api.put('/lokasi/' + editingId, formData);
        setMessage({ type: 'success', text: 'Lokasi berhasil diperbarui!' });
        setEditingId(null);
      } else {
        await api.post('/lokasi', formData);
        setMessage({ type: 'success', text: 'Lokasi berhasil ditambahkan!' });
      }

      setFormData({ nama_lokasi: '', keterangan: '' });
      fetchLocations();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Terjadi kesalahan' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (loc) => {
    setFormData({ nama_lokasi: loc.nama_lokasi, keterangan: loc.keterangan || '' });
    setEditingId(loc.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus lokasi ini?')) return;

    try {
      await api.delete('/lokasi/' + id);
      setMessage({ type: 'success', text: 'Lokasi berhasil dihapus!' });
      fetchLocations();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Gagal menghapus lokasi' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ nama_lokasi: '', keterangan: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Lokasi Tambak</h1>
        <p className="text-sm text-slate-400 mt-1">
          {isAdmin ? 'Kelola daftar lokasi tambak' : 'Daftar lokasi tambak (kelola oleh admin)'}
        </p>
      </div>

      {isAdmin && (
      <div className="card">
        <h3 className="text-base font-bold text-slate-800 mb-4">
          {editingId ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Nama Lokasi</label>
            <input
              type="text"
              name="nama_lokasi"
              value={formData.nama_lokasi}
              onChange={handleChange}
              className="input-field"
              placeholder="contoh: Tambak A"
              required
            />
          </div>
          <div>
            <label className="label-field">Keterangan (opsional)</label>
            <input
              type="text"
              name="keterangan"
              value={formData.keterangan}
              onChange={handleChange}
              className="input-field"
              placeholder="contoh: Kolam udang bagian timur"
            />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : editingId ? 'Update Lokasi' : 'Simpan Lokasi'}
            </button>
            {editingId && (
              <button type="button" className="btn-outline" onClick={handleCancelEdit}>
                Batal
              </button>
            )}
          </div>
        </form>

        {message && (
          <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}
      </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-slate-800">Daftar Lokasi</h3>
          <span className="text-sm text-slate-400 font-medium">Total: {locations.length} lokasi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Nama Lokasi</th>
                <th className="px-4 py-3 text-left">Keterangan</th>
                <th className="px-4 py-3 text-left">Dibuat</th>
                {isAdmin && <th className="px-4 py-3 text-left">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="text-center py-12 text-slate-400">
                    Belum ada lokasi. Silakan tambahkan lokasi baru.
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="table-row">
                    <td className="px-4 py-3 font-medium text-slate-800">{loc.nama_lokasi}</td>
                    <td className="px-4 py-3 text-slate-500">{loc.keterangan || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(loc.created_at).toLocaleDateString('id-ID')}</td>
                    {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(loc)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(loc.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                    )}
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

export default Lokasi;
