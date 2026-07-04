import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getInitialSession = async () => {
            const {
                data: {session}
            } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setLoading(false);
        };

        getInitialSession();

        const {
            data: {subscription}
        } = supabase.auth.onAuthStateChange(async(event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    //sign up process
    const signUp = async (email, password, fullName) => {
        const { data, error} = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        return { data, error };
    }

    //sign in/login process
    const signIn = async (email, password) => {
        const {data,error } = await supabase.auth.signInWithPassword({email, password});
        return {data, error};
    };

    //sign out/log out process
    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    //forgot password
    const forgotPassword = async email => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`, // Adjust this URL to your reset password page
        });
        return { data, error };
    }


    const value = {
        user,
        loading,
        signUp,
        signIn,
        signOut,
        forgotPassword,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};