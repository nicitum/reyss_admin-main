import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Search, Save, Users, Clock, Sunrise, Sunset, Moon } from 'lucide-react';
import { getUsers, updateAutoOrderPreferences, updateAutoOrderPreferencesBulk } from '../../services/api';

const AutoOrderPage = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalUsers, setOriginalUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Fetch all users with auto order preferences
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersData = await getUsers();
        // Ensure all users have the required fields with default values
        const usersWithDefaults = usersData.map(user => ({
          ...user,
          auto_am_order: user.auto_am_order === null || user.auto_am_order === undefined ? 'No' : user.auto_am_order,
          auto_pm_order: user.auto_pm_order === null || user.auto_pm_order === undefined ? 'No' : user.auto_pm_order,
          auto_eve_order: user.auto_eve_order === null || user.auto_eve_order === undefined ? 'No' : user.auto_eve_order,
        }));
        setUsers(usersWithDefaults);
        setOriginalUsers(usersWithDefaults);
        setFilteredUsers(usersWithDefaults);
      } catch (error) {
        toast.error('Failed to fetch users');
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = users.filter(user => 
        user.customer_id.toLowerCase().includes(term) ||
        (user.customer_name && user.customer_name.toLowerCase().includes(term)) ||
        (user.route && user.route.toLowerCase().includes(term))
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Handle preference change
  const handlePreferenceChange = (customerId, preferenceType, value) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.customer_id === customerId 
          ? { ...user, [preferenceType]: value } 
          : user
      )
    );
    
    setFilteredUsers(prevFiltered => 
      prevFiltered.map(user => 
        user.customer_id === customerId 
          ? { ...user, [preferenceType]: value } 
          : user
      )
    );
  };

  // Bulk selection functions
  const handleSelectUser = (customerId) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allSelected = filteredUsers.every(user => selectedUsers.has(user.customer_id));
    
    if (allSelected) {
      // Deselect all
      setSelectedUsers(new Set());
    } else {
      // Select all users
      const allUserIds = filteredUsers.map(user => user.customer_id);
      setSelectedUsers(new Set(allUserIds));
    }
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  // Bulk update functions using the new bulk API
  const handleBulkUpdate = async (preferenceType, value) => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    try {
      setBulkUpdating(true);
      
      // Prepare bulk update data
      const bulkUpdates = Array.from(selectedUsers).map(customerId => {
        const user = users.find(u => u.customer_id === customerId);
        return {
          customer_id: customerId,
          auto_am_order: preferenceType === 'auto_am_order' ? value : user.auto_am_order,
          auto_pm_order: preferenceType === 'auto_pm_order' ? value : user.auto_pm_order,
          auto_eve_order: preferenceType === 'auto_eve_order' ? value : user.auto_eve_order
        };
      });
      
      // Call the bulk update API
      const response = await updateAutoOrderPreferencesBulk(bulkUpdates);
      
      if (response.success) {
        // Update local state with successful updates
        const successfulCustomerIds = response.data.successful_updates.map(update => update.customer_id);
        
        // Update users state with new values for successful updates
        const updatedUsers = users.map(user => {
          if (successfulCustomerIds.includes(user.customer_id)) {
            return {
              ...user,
              [preferenceType]: value
            };
          }
          return user;
        });
        
        setUsers(updatedUsers);
        setFilteredUsers(updatedUsers);
        setOriginalUsers(updatedUsers);
        
        toast.success(`${successfulCustomerIds.length} user(s) updated successfully`);
        
        // Clear selection after successful update
        setSelectedUsers(new Set());
      } else {
        toast.error('Failed to update preferences');
      }
    } catch (error) {
      toast.error('Failed to update preferences');
      console.error('Error updating preferences:', error);
    } finally {
      setBulkUpdating(false);
    }
  };

  // Save all preferences (individual updates for changed items)
  const savePreferences = async () => {
    try {
      setSaving(true);
      
      // Find users with changed preferences
      const changedUsers = users.filter(user => {
        const originalUser = originalUsers.find(u => u.customer_id === user.customer_id);
        return (
          user.auto_am_order !== originalUser?.auto_am_order ||
          user.auto_pm_order !== originalUser?.auto_pm_order ||
          user.auto_eve_order !== originalUser?.auto_eve_order
        );
      });
      
      if (changedUsers.length === 0) {
        toast.success('No changes to save');
        setSaving(false);
        return;
      }
      
      // Prepare bulk update data for all changed users
      const bulkUpdates = changedUsers.map(user => ({
        customer_id: user.customer_id,
        auto_am_order: user.auto_am_order,
        auto_pm_order: user.auto_pm_order,
        auto_eve_order: user.auto_eve_order
      }));
      
      // Call the bulk update API
      const response = await updateAutoOrderPreferencesBulk(bulkUpdates);
      
      if (response.success) {
        // Update original users state
        setOriginalUsers(users);
        toast.success('Auto order preferences saved successfully');
      } else {
        toast.error('Failed to save preferences');
      }
    } catch (error) {
      toast.error('Failed to save preferences');
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-full mx-auto px-4 py-6">
        {/* Header with orange-red gradient to match OrderControl */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-xl p-6 mb-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Auto Order Preferences</h1>
              <p className="text-orange-100">Manage automatic order preferences for customers</p>
            </div>
            <div className="bg-orange-100 rounded-2xl p-4">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by customer ID, name, or route..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <button
              onClick={savePreferences}
              disabled={saving}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save All Preferences'}
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {filteredUsers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  {selectedUsers.size} user(s) selected
                </span>
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  {filteredUsers.every(user => selectedUsers.has(user.customer_id)) ? 'Deselect All' : 'Select All'}
                </button>
                {selectedUsers.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              {selectedUsers.size > 0 && (
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">AM Order:</span>
                    <button
                      onClick={() => handleBulkUpdate('auto_am_order', 'Yes')}
                      disabled={bulkUpdating}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        bulkUpdating 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {bulkUpdating ? 'Updating...' : 'Set All Yes'}
                    </button>
                    <button
                      onClick={() => handleBulkUpdate('auto_am_order', 'No')}
                      disabled={bulkUpdating}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        bulkUpdating 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      {bulkUpdating ? 'Updating...' : 'Set All No'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">PM Order:</span>
                    <button
                      onClick={() => handleBulkUpdate('auto_pm_order', 'Yes')}
                      disabled={bulkUpdating}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        bulkUpdating 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {bulkUpdating ? 'Updating...' : 'Set All Yes'}
                    </button>
                    <button
                      onClick={() => handleBulkUpdate('auto_pm_order', 'No')}
                      disabled={bulkUpdating}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        bulkUpdating 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      {bulkUpdating ? 'Updating...' : 'Set All No'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Evening Order:</span>
                    <button
                      onClick={() => handleBulkUpdate('auto_eve_order', 'Yes')}
                      disabled={bulkUpdating}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        bulkUpdating 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {bulkUpdating ? 'Updating...' : 'Set All Yes'}
                    </button>
                    <button
                      onClick={() => handleBulkUpdate('auto_eve_order', 'No')}
                      disabled={bulkUpdating}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        bulkUpdating 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      {bulkUpdating ? 'Updating...' : 'Set All No'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading users...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th 
                      style={{ 
                        background: 'linear-gradient(135deg, #ff6b35, #f7931e)', 
                        color: 'white', 
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                        width: '50px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={filteredUsers.length > 0 && filteredUsers.every(user => selectedUsers.has(user.customer_id))}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th 
                      style={{ 
                        background: 'linear-gradient(135deg, #ff6b35, #f7931e)', 
                        color: 'white', 
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' 
                      }}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Customer
                      </div>
                    </th>
                    <th 
                      style={{ 
                        background: 'linear-gradient(135deg, #ff6b35, #f7931e)', 
                        color: 'white', 
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' 
                      }}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    >
                      <div className="flex items-center gap-2">
                        <Sunrise className="h-4 w-4" />
                        AM Order
                      </div>
                    </th>
                    <th 
                      style={{ 
                        background: 'linear-gradient(135deg, #ff6b35, #f7931e)', 
                        color: 'white', 
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' 
                      }}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    >
                      <div className="flex items-center gap-2">
                        <Sunset className="h-4 w-4" />
                        PM Order
                      </div>
                    </th>
                    <th 
                      style={{ 
                        background: 'linear-gradient(135deg, #ff6b35, #f7931e)', 
                        color: 'white', 
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' 
                      }}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    >
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Evening Order
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr key={user.customer_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.customer_id)}
                            onChange={() => handleSelectUser(user.customer_id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.customer_id}</div>
                              <div className="text-sm text-gray-500">
                                {user.name || 'N/A'} • {user.route || 'No Route'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.auto_am_order}
                            onChange={(e) => handlePreferenceChange(user.customer_id, 'auto_am_order', e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.auto_pm_order}
                            onChange={(e) => handlePreferenceChange(user.customer_id, 'auto_pm_order', e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.auto_eve_order}
                            onChange={(e) => handlePreferenceChange(user.customer_id, 'auto_eve_order', e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {searchTerm ? 'Try adjusting your search criteria' : 'No users available'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoOrderPage;