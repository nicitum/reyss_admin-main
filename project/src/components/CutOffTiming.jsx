import React, { useState, useEffect } from 'react';
import { getCutOffTimings, updateCutOffTiming } from '../services/api';
import { Clock, Save, X, Edit, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const CutOffTiming = () => {
  const [cutOffTimings, setCutOffTimings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ from_time: '', to_time: '' });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCutOffTimings();
  }, []);

  const fetchCutOffTimings = async () => {
    try {
      setLoading(true);
      const response = await getCutOffTimings();
      if (response.success) {
        setCutOffTimings(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch cut off timings');
      }
    } catch (error) {
      console.error('Error fetching cut off timings:', error);
      toast.error('Failed to fetch cut off timings');
    } finally {
      setLoading(false);
    }
  };

  // Filter timings based on search
  const filteredTimings = cutOffTimings.filter(timing => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      timing.name.toLowerCase().includes(searchLower) ||
      timing.from_time.toLowerCase().includes(searchLower) ||
      timing.to_time.toLowerCase().includes(searchLower)
    );
  });

  const handleEditClick = (timing) => {
    setEditingId(timing.id);
    setEditData({
      from_time: timing.from_time,
      to_time: timing.to_time
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({ from_time: '', to_time: '' });
  };

  const handleSave = async (name) => {
    try {
      // Validate time format (HH:MM:SS)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!timeRegex.test(editData.from_time) || !timeRegex.test(editData.to_time)) {
        toast.error('Invalid time format. Use HH:MM:SS');
        return;
      }

      // Validate time restrictions based on name
      const validationResult = validateTimeRestrictions(name, editData.from_time, editData.to_time);
      if (!validationResult.isValid) {
        toast.error(validationResult.message);
        return;
      }

      const response = await updateCutOffTiming(name, editData.from_time, editData.to_time);
      
      if (response.success) {
        toast.success('Cut off timing updated successfully');
        setEditingId(null);
        fetchCutOffTimings(); // Refresh the data
      } else {
        toast.error(response.message || 'Failed to update cut off timing');
      }
    } catch (error) {
      console.error('Error updating cut off timing:', error);
      toast.error('Failed to update cut off timing');
    }
  };

  // Validate time restrictions based on cut off name
  const validateTimeRestrictions = (name, fromTime, toTime) => {
    const [fromHours, fromMinutes, fromSeconds] = fromTime.split(':').map(Number);
    const [toHours, toMinutes, toSeconds] = toTime.split(':').map(Number);
    
    const fromTotalSeconds = fromHours * 3600 + fromMinutes * 60 + fromSeconds;
    const toTotalSeconds = toHours * 3600 + toMinutes * 60 + toSeconds;
    
    switch (name.toLowerCase()) {
      case 'am':
        // AM: 00:00:00 to 11:59:59
        if (fromTotalSeconds < 0 || toTotalSeconds >= 43200) { // 43200 = 12:00:00
          return {
            isValid: false,
            message: 'AM times must be between 12:00:00 AM and 11:59:59 AM'
          };
        }
        break;
      case 'pm':
        // PM: 12:00:00 to 23:59:59
        if (fromTotalSeconds < 43200 || toTotalSeconds >= 86400) { // 86400 = 24:00:00
          return {
            isValid: false,
            message: 'PM times must be between 12:00:00 PM and 11:59:59 PM'
          };
        }
        break;
      case 'evening':
        // Evening: 12:00:00 to 23:59:59 (same as PM)
        if (fromTotalSeconds < 43200 || toTotalSeconds >= 86400) { // 86400 = 24:00:00
          return {
            isValid: false,
            message: 'Evening times must be between 12:00:00 PM and 11:59:59 PM'
          };
        }
        break;
      default:
        // No restrictions for other names
        break;
    }
    
    // Ensure from_time is before to_time
    if (fromTotalSeconds >= toTotalSeconds) {
      return {
        isValid: false,
        message: 'From time must be before To time'
      };
    }
    
    return { isValid: true };
  };

  // Format time for user-friendly input
  const formatTimeForInput = (time) => {
    if (!time) return { hours: '', minutes: '', seconds: '' };
    
    const [hours, minutes, seconds] = time.split(':');
    return { hours: hours || '', minutes: minutes || '', seconds: seconds || '' };
  };

  // Convert input values to time format
  const convertToTimeFormat = (hours, minutes, seconds) => {
    // Pad with zeros if needed
    const h = String(hours || '00').padStart(2, '0');
    const m = String(minutes || '00').padStart(2, '0');
    const s = String(seconds || '00').padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleTimeChange = (field, timeComponent, value) => {
    // Ensure value is a number and within valid range
    let numValue = parseInt(value, 10);
    
    // Handle empty or invalid values
    if (isNaN(numValue)) {
      numValue = '';
    } else {
      // Apply range limits
      if (timeComponent === 'hours') {
        numValue = Math.max(0, Math.min(23, numValue));
      } else if (timeComponent === 'minutes' || timeComponent === 'seconds') {
        numValue = Math.max(0, Math.min(59, numValue));
      }
    }
    
    // Update the editData state
    const currentTime = editData[field];
    const timeParts = formatTimeForInput(currentTime);
    timeParts[timeComponent] = numValue;
    
    const newTime = convertToTimeFormat(timeParts.hours, timeParts.minutes, timeParts.seconds);
    
    setEditData(prev => ({
      ...prev,
      [field]: newTime
    }));
  };

  // Get time restrictions message based on cut off name
  const getTimeRestrictionsMessage = (name) => {
    switch (name.toLowerCase()) {
      case 'am':
        return 'AM times: 12:00:00 AM to 11:59:59 AM';
      case 'pm':
        return 'PM times: 12:00:00 PM to 11:59:59 PM';
      case 'evening':
        return 'Evening times: 12:00:00 PM to 11:59:59 PM';
      default:
        return 'Times: 00:00:00 to 23:59:59';
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading cut off timings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cut Off Timings</h1>
              <p className="text-gray-600 mt-1">Manage cut off times for different operations</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Search & Filter
            </h2>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Bar */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by name or time..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              {/* Results Summary */}
              <div className="flex items-center justify-between md:justify-end">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{filteredTimings.length}</span> of{" "}
                  <span className="font-semibold">{cutOffTimings.length}</span> timings
                </div>
                
                {searchTerm && (
                  <button
                    onClick={clearFilters}
                    className="ml-4 text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors duration-200"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timings Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold">Cut Off Timings List</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTimings.map((timing) => (
                  <tr key={timing.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="mr-2 text-orange-500" size={16} />
                        <span className="text-sm font-medium text-gray-900">
                          {timing.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === timing.id ? (
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2 mb-1">
                            <input
                              type="number"
                              min="0"
                              max="23"
                              value={formatTimeForInput(editData.from_time).hours}
                              onChange={(e) => handleTimeChange('from_time', 'hours', e.target.value)}
                              className="border rounded px-2 py-1 w-16 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="HH"
                            />
                            <span>:</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={formatTimeForInput(editData.from_time).minutes}
                              onChange={(e) => handleTimeChange('from_time', 'minutes', e.target.value)}
                              className="border rounded px-2 py-1 w-16 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="MM"
                            />
                            <span>:</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={formatTimeForInput(editData.from_time).seconds}
                              onChange={(e) => handleTimeChange('from_time', 'seconds', e.target.value)}
                              className="border rounded px-2 py-1 w-16 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="SS"
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {getTimeRestrictionsMessage(timing.name)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">{timing.from_time}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === timing.id ? (
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2 mb-1">
                            <input
                              type="number"
                              min="0"
                              max="23"
                              value={formatTimeForInput(editData.to_time).hours}
                              onChange={(e) => handleTimeChange('to_time', 'hours', e.target.value)}
                              className="border rounded px-2 py-1 w-16 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="HH"
                            />
                            <span>:</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={formatTimeForInput(editData.to_time).minutes}
                              onChange={(e) => handleTimeChange('to_time', 'minutes', e.target.value)}
                              className="border rounded px-2 py-1 w-16 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="MM"
                            />
                            <span>:</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={formatTimeForInput(editData.to_time).seconds}
                              onChange={(e) => handleTimeChange('to_time', 'seconds', e.target.value)}
                              className="border rounded px-2 py-1 w-16 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="SS"
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {getTimeRestrictionsMessage(timing.name)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">{timing.to_time}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingId === timing.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSave(timing.name)}
                            className="flex items-center text-green-600 hover:text-green-800 transition-colors duration-200"
                          >
                            <Save size={16} className="mr-1" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200"
                          >
                            <X size={16} className="mr-1" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(timing)}
                          className="flex items-center text-orange-600 hover:text-orange-800 transition-colors duration-200"
                        >
                          <Edit size={16} className="mr-1" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredTimings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <Clock className="mx-auto mb-4 text-gray-300" size={48} />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No cut off timings found</h3>
                      <p className="text-sm">
                        {searchTerm 
                          ? "Try adjusting your search criteria" 
                          : "Cut off timings will appear here"}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Information Panel */}
        <div className="mt-6 bg-blue-50 rounded-xl shadow-lg p-5 border border-blue-100">
          <h3 className="font-bold text-blue-800 mb-3 flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Time Restrictions Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-700">AM</h4>
              <p className="text-sm text-gray-600 mt-1">12:00:00 AM to 11:59:59 AM</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-700">PM</h4>
              <p className="text-sm text-gray-600 mt-1">12:00:00 PM to 11:59:59 PM</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-700">Evening</h4>
              <p className="text-sm text-gray-600 mt-1">12:00:00 PM to 11:59:59 PM</p>
            </div>
          </div>
          <p className="mt-3 text-blue-700 text-sm">
            <strong>Note:</strong> From time must be before To time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CutOffTiming;