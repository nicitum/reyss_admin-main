import React, { useState, useEffect } from 'react';
import { getCutOffTimings, updateCutOffTiming } from '../services/api';
import toast from 'react-hot-toast';

const CutOffTiming = () => {
  const [cutOffTimings, setCutOffTimings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ from_time: '', to_time: '' });

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Cut Off Timings</h2>
      <p className="text-gray-600 mb-4">Set cut off times for different operations. Times are in 24-hour format (HH:MM:SS).</p>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 text-left border-b">Name</th>
              <th className="py-3 px-4 text-left border-b">From Time</th>
              <th className="py-3 px-4 text-left border-b">To Time</th>
              <th className="py-3 px-4 text-left border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cutOffTimings.map((timing) => (
              <tr key={timing.id} className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b font-medium">{timing.name}</td>
                <td className="py-3 px-4 border-b">
                  {editingId === timing.id ? (
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-1">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={formatTimeForInput(editData.from_time).hours}
                          onChange={(e) => handleTimeChange('from_time', 'hours', e.target.value)}
                          className="border rounded px-2 py-1 w-16"
                          placeholder="HH"
                        />
                        <span>:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={formatTimeForInput(editData.from_time).minutes}
                          onChange={(e) => handleTimeChange('from_time', 'minutes', e.target.value)}
                          className="border rounded px-2 py-1 w-16"
                          placeholder="MM"
                        />
                        <span>:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={formatTimeForInput(editData.from_time).seconds}
                          onChange={(e) => handleTimeChange('from_time', 'seconds', e.target.value)}
                          className="border rounded px-2 py-1 w-16"
                          placeholder="SS"
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {getTimeRestrictionsMessage(timing.name)}
                      </div>
                    </div>
                  ) : (
                    timing.from_time
                  )}
                </td>
                <td className="py-3 px-4 border-b">
                  {editingId === timing.id ? (
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-1">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={formatTimeForInput(editData.to_time).hours}
                          onChange={(e) => handleTimeChange('to_time', 'hours', e.target.value)}
                          className="border rounded px-2 py-1 w-16"
                          placeholder="HH"
                        />
                        <span>:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={formatTimeForInput(editData.to_time).minutes}
                          onChange={(e) => handleTimeChange('to_time', 'minutes', e.target.value)}
                          className="border rounded px-2 py-1 w-16"
                          placeholder="MM"
                        />
                        <span>:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={formatTimeForInput(editData.to_time).seconds}
                          onChange={(e) => handleTimeChange('to_time', 'seconds', e.target.value)}
                          className="border rounded px-2 py-1 w-16"
                          placeholder="SS"
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {getTimeRestrictionsMessage(timing.name)}
                      </div>
                    </div>
                  ) : (
                    timing.to_time
                  )}
                </td>
                <td className="py-3 px-4 border-b">
                  {editingId === timing.id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSave(timing.name)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditClick(timing)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {cutOffTimings.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No cut off timings found.
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold text-blue-800 mb-2">Time Restrictions:</h3>
        <ul className="list-disc pl-5 text-blue-700 text-sm space-y-1">
          <li><strong>AM</strong>: 12:00:00 AM to 11:59:59 AM (00:00:00 to 11:59:59)</li>
          <li><strong>PM</strong>: 12:00:00 PM to 11:59:59 PM (12:00:00 to 23:59:59)</li>
          <li><strong>Evening</strong>: 12:00:00 PM to 11:59:59 PM (12:00:00 to 23:59:59)</li>
        </ul>
        <p className="mt-2 text-blue-700 text-sm">
          <strong>Note:</strong> From time must be before To time.
        </p>
      </div>
    </div>
  );
};

export default CutOffTiming;