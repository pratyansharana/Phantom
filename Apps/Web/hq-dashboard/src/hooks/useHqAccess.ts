import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../config/firebase';

const ALLOWED_HQ_EMAIL = 'pratyanshrana1@gmail.com';

export const useHqAccess = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isHq, setIsHq] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async nextUser => {
      setUser(nextUser);
      setError(null);

      if (!nextUser) {
        setIsHq(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setIsHq(nextUser.email?.trim().toLowerCase() === ALLOWED_HQ_EMAIL);
      setLoading(false);
    });
  }, []);

  return { user, isHq, loading, error };
};
