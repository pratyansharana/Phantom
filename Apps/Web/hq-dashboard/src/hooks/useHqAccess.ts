import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const HQ_CONFIG_DOC = 'hq_operator';

type HqOperatorConfig = {
  active?: boolean;
  allowedEmails?: string[];
  name?: string;
  role?: string;
};

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

      try {
        setLoading(true);
        const snapshot = await getDoc(doc(db, 'hq_operators', HQ_CONFIG_DOC));
        const config = snapshot.data() as HqOperatorConfig | undefined;
        const email = nextUser.email?.trim().toLowerCase();
        const allowed = (config?.allowedEmails || []).map(value => value.trim().toLowerCase());
        setIsHq(
          snapshot.exists()
          && config?.active !== false
          && !!email
          && allowed.includes(email)
        );
      } catch (err) {
        console.error(err);
        setIsHq(false);
        setError('Unable to verify HQ access.');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return { user, isHq, loading, error };
};
