import React from "react";
import { Lock, Unlock, Edit } from "lucide-react";
import { formatEpochTime } from "../../utils/dateUtils";

export default function UserTable({ users, onToggleBlock, onEditUser }) {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")); // Get logged-in user info

  return (
    <div className="bg-white shadow-md rounded-lg">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Username
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Route
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price Tier
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            {loggedInUser?.role === "superadmin" && (
              <>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {user.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {loggedInUser?.role === "superadmin" ? user.customer_id : user.cust_id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.phone}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.route}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  user.price_tier ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {user.price_tier || 'Not Set'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${user.status === "Block" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
                >
                  {user.status === "Block" ? "Blocked" : "Active"}
                </span>
              </td>
              {loggedInUser?.role === "superadmin" && (
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatEpochTime(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onToggleBlock(user.customer_id, user.status)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      {user.status === "Active" ? (
                        <Unlock className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => onEditUser(user)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}