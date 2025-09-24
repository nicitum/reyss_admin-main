import React from "react";
import { Lock, Unlock, Edit, User, Hash, Phone, MapPin, CreditCard, Clock, UserCheck, UserX } from "lucide-react";
import { formatEpochTime } from "../../utils/dateUtils";

export default function UserTable({ users, onToggleBlock, onEditUser }) {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")); // Get logged-in user info

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-orange-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                User Info
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">
              <div className="flex items-center">
                <Hash className="h-4 w-4 mr-2" />
                Customer ID
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                Phone
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Route
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Price Tier
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">
              <div className="flex items-center">
                <UserCheck className="h-4 w-4 mr-2" />
                Status
              </div>
            </th>
            {loggedInUser?.role === "superadmin" && (
              <>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Created At
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">
                  Actions
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-orange-50 transition-colors duration-150">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.username}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 font-mono">#{user.customer_id}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{user.phone}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-orange-400 mr-1" />
                  <div className="text-sm text-gray-900">{user.route || 'Not Assigned'}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  user.price_tier ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {user.price_tier || 'Not Set'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${user.status === "Block" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
                >
                  {user.status === "Block" ? (
                    <div className="flex items-center">
                      <UserX className="h-3 w-3 mr-1" />
                      Blocked
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Active
                    </div>
                  )}
                </span>
              </td>
              {loggedInUser?.role === "superadmin" && (
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatEpochTime(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onToggleBlock(user.customer_id, user.status)}
                        className={`p-2 rounded-full ${
                          user.status === "Active" 
                            ? "text-red-600 hover:bg-red-100" 
                            : "text-green-600 hover:bg-green-100"
                        } transition-colors duration-200`}
                        title={user.status === "Active" ? "Block User" : "Activate User"}
                      >
                        {user.status === "Active" ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          <Unlock className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => onEditUser(user)}
                        className="p-2 rounded-full text-orange-600 hover:bg-orange-100 transition-colors duration-200"
                        title="Edit User"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      {users.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
}