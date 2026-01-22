'use client';

import { useState, useEffect, useCallback } from 'react';
import { Course, CourseWithChapters } from '@/types/course';
import * as courseService from '@/lib/services/courses';

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getCourses();
      setCourses(data);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return { courses, loading, error, refetch: fetchCourses };
}

/**
 * Hook to fetch courses where user is creator OR co-instructor
 * If isAdmin is true, fetches all courses
 */
export function useInstructorCourses(instructorId: string | null, isAdmin: boolean = false) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!instructorId && !isAdmin) {
      setCourses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Admins see all courses, instructors see their own + shared
      const data = isAdmin 
        ? await courseService.getCourses()
        : await courseService.getInstructorCourses(instructorId!);
      setCourses(data);
    } catch (err) {
      console.error('Error fetching instructor courses:', err);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [instructorId, isAdmin]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return { courses, loading, error, refetch: fetchCourses };
}

export function useCourse(courseId: string | null) {
  const [course, setCourse] = useState<CourseWithChapters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      setCourse(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getCourseWithChapters(courseId);
      setCourse(data);
    } catch (err) {
      console.error('Error fetching course:', err);
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  return { course, loading, error, refetch: fetchCourse };
}
