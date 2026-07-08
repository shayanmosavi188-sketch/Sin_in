'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Phone, 
  Calendar, 
  UserPlus, 
  Trash2, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  deleteDoc, 
  doc,
  getDocFromServer
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: false,
      isAnonymous: false,
      tenantId: null
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface RegisteredUser {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  age: number;
  registeredAt: string;
}

export default function SignupPage() {
  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [age, setAge] = useState('');

  // Touched states for real-time validation feedback
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Registered users list state
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  
  // UI states
  const [showUsersList, setShowUsersList] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test Connection to Firestore and load initial data from Firestore in real-time
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    // Subscribe to Firestore updates
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers: RegisteredUser[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const createdAtDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        const registeredAtString = createdAtDate.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        fetchedUsers.push({
          id: docSnapshot.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phoneNumber: data.phoneNumber || '',
          age: Number(data.age) || 0,
          registeredAt: registeredAtString,
        });
      });
      setUsers(fetchedUsers);
      setPermissionError(false);
    }, (error) => {
      setPermissionError(true);
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: OperationType.LIST,
        path: 'users'
      };
      console.error('Firestore Error:', JSON.stringify(errInfo));
    });

    return () => unsubscribe();
  }, []);

  // Field validation functions
  const validateFirstName = (val: string) => {
    if (!val.trim()) return 'وارد کردن نام الزامی است';
    if (val.trim().length < 2) return 'نام باید حداقل ۲ حرف باشد';
    // Match Persian & English letters
    if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(val)) return 'نام فقط باید حاوی حروف باشد';
    return null;
  };

  const validateLastName = (val: string) => {
    if (!val.trim()) return 'وارد کردن نام خانوادگی الزامی است';
    if (val.trim().length < 2) return 'نام خانوادگی باید حداقل ۲ حرف باشد';
    if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(val)) return 'نام خانوادگی فقط باید حاوی حروف باشد';
    return null;
  };

  const validatePhoneNumber = (val: string) => {
    if (!val.trim()) return 'وارد کردن شماره تماس الزامی است';
    // Check for standard Iranian mobile phone numbers: 11 digits, starts with 09
    const irPhoneNumberRegex = /^09[0-9]{9}$/;
    if (!irPhoneNumberRegex.test(val)) {
      return 'شماره تماس نامعتبر است (مثال: ۰۹۱۲۳۴۵۶۷۸۹)';
    }
    return null;
  };

  const validateAge = (val: string) => {
    if (!val.trim()) return 'وارد کردن سن الزامی است';
    const ageNum = parseInt(val, 10);
    if (isNaN(ageNum)) return 'سن باید یک عدد معتبر باشد';
    if (ageNum < 1 || ageNum > 120) return 'سن باید بین ۱ تا ۱۲۰ سال باشد';
    return null;
  };

  // Touched state trigger helper
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Set all fields to touched to trigger errors
    setTouched({
      firstName: true,
      lastName: true,
      phoneNumber: true,
      age: true
    });

    const errFirst = validateFirstName(firstName);
    const errLast = validateLastName(lastName);
    const errPhone = validatePhoneNumber(phoneNumber);
    const errAge = validateAge(age);

    if (errFirst || errLast || errPhone || errAge) {
      setErrorMessage('لطفاً خطاهای فرم را برطرف کنید و دوباره تلاش کنید.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const currentFirstName = firstName.trim();
    const currentLastName = lastName.trim();

    // Success - Save to Firestore
    try {
      await addDoc(collection(db, 'users'), {
        firstName: currentFirstName,
        lastName: currentLastName,
        phoneNumber: phoneNumber.trim(),
        age: parseInt(age, 10),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
      setErrorMessage('خطایی در ارتباط با پایگاه داده رخ داد.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    // Reset Form
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setAge('');
    setTouched({});
    
    // Alert user
    setSuccessMessage(`${currentFirstName} ${currentLastName} با موفقیت ثبت‌نام شد!`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const handleClearAll = async () => {
    try {
      const deletePromises = users.map((u) => deleteDoc(doc(db, 'users', u.id)));
      await Promise.all(deletePromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    }
  };

  // Inline errors calculation
  const errorFirst = touched.firstName ? validateFirstName(firstName) : null;
  const errorLast = touched.lastName ? validateLastName(lastName) : null;
  const errorPhone = touched.phoneNumber ? validatePhoneNumber(phoneNumber) : null;
  const errorAge = touched.age ? validateAge(age) : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between py-10 px-4 select-none relative overflow-x-hidden">
      
      {/* Upper ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-sky-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-center">
        
        {/* Header Branding */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 mb-4">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">سامانه ثبت‌نام کاربران</h1>
          <p className="text-slate-500 mt-2 text-sm">لطفاً اطلاعات زیر را برای ایجاد حساب کاربری وارد کنید</p>
        </motion.div>

        {/* Firestore Permission Error Troubleshooting Box */}
        {permissionError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-50 border border-amber-200 text-amber-900 rounded-3xl p-6 mb-6 space-y-4 shadow-md text-sm font-medium"
          >
            <div className="flex items-center gap-2 text-amber-800 font-bold text-base border-b border-amber-200 pb-2">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              <span>راهنمای حل خطای دسترسی Firestore</span>
            </div>
            <p className="leading-relaxed">
              اتصال به پروژه فایربیس شما برقرار است، اما قوانین امنیتی (Security Rules) در پنل کاربری شما اجازه خواندن یا نوشتن اطلاعات را نمی‌دهند. لطفاً مراحل زیر را طی کنید:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-amber-800 text-xs leading-relaxed">
              <li>وارد پنل فایربیس شوید: <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-700">console.firebase.google.com</a></li>
              <li>پروژه خود با شناسه <strong className="font-mono bg-amber-100 px-1 py-0.5 rounded">test2-9cc6a</strong> را انتخاب کنید.</li>
              <li>از منوی سمت چپ وارد بخش <strong className="font-semibold">Firestore Database</strong> شده و تب <strong className="font-semibold">Rules</strong> را باز کنید.</li>
              <li>قوانین را به صورت زیر ویرایش کنید تا دسترسی خواندن و نوشتن عمومی فعال شود:</li>
            </ol>
            <pre className="bg-amber-950 text-amber-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto text-left" dir="ltr">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
            </pre>
            <p className="text-xs leading-relaxed">
              ۵. روی دکمه <strong className="font-semibold">Publish</strong> کلیک کنید. تغییرات پس از چند ثانیه به صورت خودکار در این صفحه اعمال خواهند شد.
            </p>
          </motion.div>
        )}

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-100/80 overflow-hidden"
        >
          {/* Accent Line */}
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-sky-500 w-full" />

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            
            {/* Feedback Alerts */}
            <AnimatePresence mode="wait">
              {successMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-start gap-3 text-sm font-medium"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>{successMessage}</div>
                </motion.div>
              )}

              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-start gap-3 text-sm font-medium"
                >
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>{errorMessage}</div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* First Name Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">نام</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                    placeholder="مانند: علی"
                    className={cn(
                      "w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm font-medium",
                      errorFirst 
                        ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500" 
                        : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    )}
                  />
                </div>
                {errorFirst && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errorFirst}
                  </p>
                )}
              </div>

              {/* Last Name Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">نام خانوادگی</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                    placeholder="مانند: رضایی"
                    className={cn(
                      "w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm font-medium",
                      errorLast 
                        ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500" 
                        : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    )}
                  />
                </div>
                {errorLast && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errorLast}
                  </p>
                )}
              </div>

            </div>

            {/* Phone Number Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">شماره تماس</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  maxLength={11}
                  value={phoneNumber}
                  onChange={(e) => {
                    // Only allow digits
                    const cleaned = e.target.value.replace(/[^0-9]/g, '');
                    setPhoneNumber(cleaned);
                  }}
                  onBlur={() => handleBlur('phoneNumber')}
                  placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                  dir="ltr"
                  className={cn(
                    "w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-2xl text-left tracking-wider text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm font-semibold",
                    errorPhone 
                      ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500" 
                      : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                  )}
                />
              </div>
              {errorPhone && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errorPhone}
                </p>
              )}
            </div>

            {/* Age Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">سن</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  maxLength={3}
                  value={age}
                  onChange={(e) => {
                    // Only allow digits
                    const cleaned = e.target.value.replace(/[^0-9]/g, '');
                    setAge(cleaned);
                  }}
                  onBlur={() => handleBlur('age')}
                  placeholder="مانند: ۲۵"
                  className={cn(
                    "w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm font-semibold",
                    errorAge 
                      ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500" 
                      : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                  )}
                />
              </div>
              {errorAge && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errorAge}
                </p>
              )}
            </div>

            {/* Register Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium py-3.5 px-4 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer transition-all border border-indigo-700/50 mt-8"
            >
              <UserPlus className="w-5 h-5" />
              <span>ثبت اطلاعات کاربر</span>
            </motion.button>

          </form>
        </motion.div>

        {/* Collapse Button for Registered Users */}
        <div className="text-center mt-8">
          <button
            onClick={() => setShowUsersList(!showUsersList)}
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-all cursor-pointer bg-indigo-50 hover:bg-indigo-100/80 px-4 py-2 rounded-xl"
          >
            <Users className="w-4.5 h-4.5" />
            <span>{showUsersList ? 'پنهان کردن لیست کاربران' : 'مشاهده کاربران ثبت‌نام‌شده'}</span>
            <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {users.length}
            </span>
          </button>
        </div>

        {/* List Section */}
        <AnimatePresence>
          {showUsersList && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mt-6"
            >
              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <span>کاربران اخیراً ثبت‌نام‌شده</span>
                  </h3>
                  {users.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                    >
                      پاک کردن همه
                    </button>
                  )}
                </div>

                {users.length === 0 ? (
                  <p className="text-slate-400 text-center py-6 text-sm">هیچ کاربری ثبت‌نام نکرده است.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                    {users.map((user) => (
                      <motion.div
                        layout
                        key={user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="py-3.5 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800 text-sm">
                            {user.firstName} {user.lastName}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {user.phoneNumber}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              سن: {user.age} سال
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-300 bg-slate-50 px-2 py-0.5 rounded font-mono">
                            {user.registeredAt}
                          </span>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-slate-300 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="حذف کاربر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Footer credits / branding */}
      <footer className="text-center text-slate-400 text-xs mt-10">
        <p>برنامه ساخته شده با ❤️ با استفاده از استاندارد مدرن تایپ‌اسکریپت و ری‌اکت</p>
      </footer>
    </main>
  );
}
