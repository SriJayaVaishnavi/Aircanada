import React, { useState } from 'react';
import { MOCK_CREDENTIALS } from '../constants';
import { useSharedData } from '../contexts/SharedDataContext';

export const EmployeeLogin: React.FC = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useSharedData();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const credential = MOCK_CREDENTIALS.find(
            c => c.userId === userId && c.password === password
        );

        if (credential) {
            login(credential.userId, credential.name, credential.role);
        } else {
            setError('Invalid credentials. Please try again.');
        }
    };

    return (
        <div className="min-h-[600px] flex items-center justify-center bg-gradient-to-br from-[#001E62] to-[#00A0DC] p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
                <div className="flex items-center justify-center mb-8">
                    <div className="w-16 h-16 bg-[#DA291C] rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-black text-2xl italic">AC</span>
                    </div>
                </div>

                <h2 className="text-2xl font-black text-gray-900 text-center mb-2">Employee Login</h2>
                <p className="text-sm text-gray-500 text-center mb-8">Enter your credentials to access your dashboard</p>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Employee ID
                        </label>
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            placeholder="e.g., AC78923"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/20 focus:border-[#DA291C] transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/20 focus:border-[#DA291C] transition-all"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-4 bg-[#DA291C] text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Sign In
                    </button>
                </form>


            </div>
        </div>
    );
};
