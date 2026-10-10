import { notFound, redirect } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import MaterialList from './material-list';
import UploadForm from './upload-form';

type Params = Promise<{ subjectId: string }>;

export default async function SubjectMaterialsPage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');

  const { subjectId } = await params;

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { department: { select: { code: true, name: true } } },
  });
  if (!subject) notFound();

  if (principal.role === 'STUDENT') {
    if (
      !principal.class ||
      principal.class.semester !== subject.semester ||
      principal.departmentId !== subject.departmentId
    ) {
      notFound();
    }
  } else if (principal.role === 'HOD' || principal.role === 'ADMIN') {
    if (principal.departmentId !== subject.departmentId) notFound();
  } else {
    const teaches = await prisma.teachingAssignment.findFirst({
      where: { facultyId: principal.id, subjectId },
    });
    if (!teaches) notFound();
  }

  const materialWhere: Record<string, unknown> = { subjectId };
  if (principal.role === 'STUDENT') {
    materialWhere.classId = principal.classId;
  } else if (principal.role === 'HOD' || principal.role === 'ADMIN') {
    materialWhere.class = { departmentId: principal.departmentId };
  } else {
    materialWhere.class = {
      OR: [
        { inchargeId: principal.id },
        { teaching: { some: { facultyId: principal.id, subjectId } } },
      ],
    };
  }

  const materials = await prisma.material.findMany({
    where: materialWhere,
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    include: {
      uploadedBy: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
    },
  });

  const uploadableClasses = await loadUploadableClasses(principal, subject.id);
  const canUpload = uploadableClasses.length > 0;

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        {subject.code} · {subject.name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {subject.department.name} · Semester {subject.semester}
      </Typography>

      <MaterialList
        materials={materials.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          type: m.type,
          fileName: m.fileName,
          sizeBytes: m.sizeBytes,
          createdAt: m.createdAt,
          uploadedBy: { id: m.uploadedBy.id, name: m.uploadedBy.name },
          className: m.class.name,
          canDelete:
            m.uploadedBy.id === principal.id ||
            principal.role === 'HOD' ||
            principal.role === 'ADMIN',
        }))}
      />

      {canUpload && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Upload material
          </Typography>
          <UploadForm subjectId={subject.id} classes={uploadableClasses} />
        </Box>
      )}
    </Box>
  );
}

async function loadUploadableClasses(
  principal: {
    role: string;
    id: string;
    departmentId: string | null;
  },
  subjectId: string,
): Promise<{ id: string; name: string }[]> {
  const { prisma } = await import('@/lib/db');

  if (principal.role === 'HOD' || principal.role === 'ADMIN') {
    if (!principal.departmentId) return [];
    return prisma.class.findMany({
      where: { departmentId: principal.departmentId },
      orderBy: [{ semester: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    });
  }

  const assignments = await prisma.teachingAssignment.findMany({
    where: { facultyId: principal.id, subjectId },
    include: { class: { select: { id: true, name: true } } },
  });
  return assignments.map((a) => a.class);
}