"use client";

import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TeacherRegistrationForm from '@/components/TeacherRegistrationForm';
import StudentRegistrationForm from '@/components/StudentRegistrationForm';

const RegisterPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-extrabold text-center text-gray-900 dark:text-white">
            Kayıt Ol
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="teacher" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teacher">Öğretmen Kaydı</TabsTrigger>
              <TabsTrigger value="student">Öğrenci Kaydı</TabsTrigger>
            </TabsList>
            <TabsContent value="teacher" className="mt-4">
              <TeacherRegistrationForm />
            </TabsContent>
            <TabsContent value="student" className="mt-4">
              <StudentRegistrationForm />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link to="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            Zaten bir hesabınız var mı? Giriş Yap
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterPage;