import React from 'react';
import { supabase } from '../supabaseClient';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';

const Dashboard = ({ user }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // Or update state user in App
  };

  return (
    <>
    <div>
      {/* Conditional rendering based on user role */}
      {user?.user_metadata?.role === 'admin' ? (
        <AdminDashboard user={user} handleLogout={handleLogout} />
      ) : user?.user_metadata?.role === 'user' ? (
        <UserDashboard user={user} handleLogout={handleLogout} />
      ) : (
        <p>No role assigned or unknown role.</p>
      )}
    </div>
    </>
  );
};

export default Dashboard;
