import React, { useEffect, useState } from 'react';
import { getUserRoles } from '../api';
import { getAccessToken } from '../auth';

const ManageContentButton = () => {
    const [roles, setRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const token = await getAccessToken(); // Implement this function to get the access token
                const userRoles = await getUserRoles(token);
                setRoles(userRoles);
            } catch (error) {
                console.error("Failed to fetch user roles", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRoles();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (roles.includes('my-content-manager')) {
        return <button>Manage Content</button>;
    }

    return null;
};

export default ManageContentButton;
