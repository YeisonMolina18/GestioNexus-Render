import React from 'react';

const StrengthIndicator = ({ label, isValid }) => (
    <div className={`flex items-center text-sm transition-colors ${isValid ? 'text-green-600' : 'text-gray-500'}`}>
        {isValid ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
        )}
        <span>{label}</span>
    </div>
);

const PasswordStrengthIndicator = ({ password }) => {
    // --- EXPRESIONES REGULARES ACTUALIZADAS ---
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    // Se han eliminado los caracteres prohibidos de esta lista
    const hasSpecialChar = /[!@#$%^()_+\-=\[\]{};:.,\/?~`]/.test(password);
    // Esta expresión ahora prohíbe explícitamente los caracteres no deseados y espacios
    const hasNoInvalidChars = /^[A-Za-z\d!@#$%^()_+\-=\[\]{};:.,\/?~`]*$/.test(password) && !/\s/.test(password);

    if (!password && password !== '') return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 p-3 bg-gray-50 rounded-md">
            <StrengthIndicator label="8 caracteres mínimo" isValid={hasMinLength} />
            <StrengthIndicator label="Una mayúscula" isValid={hasUppercase} />
            <StrengthIndicator label="Una minúscula" isValid={hasLowercase} />
            <StrengthIndicator label="Un número" isValid={hasNumber} />
            <StrengthIndicator label="Un caracter especial" isValid={hasSpecialChar} />
            <StrengthIndicator label="Sin espacios o ñ/tildes" isValid={hasNoInvalidChars} />
        </div>
    );
};

export default PasswordStrengthIndicator;