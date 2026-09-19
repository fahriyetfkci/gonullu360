import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { body, application } from './community.schema';
import { Router, Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';
import { organizationContext, OrganizationRequest } from './organization';

const sendCreated = (res: import("express").Response, data: unknown): void => sendSuccess(res, data, 201);
const router = Router();
router.use(organizationContext);
router.use(validate(z.object({ query: z.object({
  page: z.coerce.number().int().positive().max(1000000).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  startDate: z.string().date().or(z.literal('')).optional(),
  endDate: z.string().date().or(z.literal('')).optional(),
}).passthrough() })));
router.param('id', (_req, _res, next, value) => {
  const parsed = z.coerce.number().int().positive().safeParse(value);
  if (!parsed.success) return next(parsed.error);
  next();
});
const pageParams = (req: Request, defaultLimit: number): { page: number; limit: number; skip: number } => { const page=Math.max(1,Number(req.query.page)||1); const limit=Math.min(100,Math.max(1,Number(req.query.limit)||defaultLimit)); return {page,limit,skip:(page-1)*limit}; };
type ApplicationRecord = Prisma.ApplicationGetPayload<Record<string, never>>;
const applicationDto = (item: ApplicationRecord): Omit<ApplicationRecord, "organizationId" | "createdAt" | "interests"> & { created_at: Date; applicationDate: Date; interests: string[] } => ({id:item.id,name:item.name,city:item.city,gender:item.gender,age:item.age,education:item.education,status:item.status,created_at:item.createdAt,applicationDate:item.createdAt,phone:item.phone,email:item.email,address:item.address,interests:item.interests?JSON.parse(item.interests):[],coverLetter:item.coverLetter,evaluationNote:item.evaluationNote});

router.get('/all',asyncHandler(async(req:OrganizationRequest,res)=>{
  const {page,limit,skip}=pageParams(req,20); const search=String(req.query.search||''); const name=search?{contains:search,mode:'insensitive' as const}:undefined; const organizationId=req.organizationId!;
  const nameFilter=search?Prisma.sql`AND "name" ILIKE ${`%${search}%`}`:Prisma.empty;
  type CombinedApplication={id:number;fullName:string;applicationDate:Date;educationLevel:string;status:string};
  const [items,volunteerTotal,applicationTotal]=await Promise.all([
    prisma.$queryRaw<CombinedApplication[]>(Prisma.sql`
      SELECT "id", "name" AS "fullName", "created_at" AS "applicationDate", "education" AS "educationLevel", 'Aktif Gönüllü' AS "status"
      FROM "volunteers"
      WHERE "organization_id"=${organizationId} ${nameFilter}
      UNION ALL
      SELECT "id", "name" AS "fullName", "created_at" AS "applicationDate", "education" AS "educationLevel", "status"
      FROM "applications"
      WHERE "organization_id"=${organizationId} AND "status"<>'Aktif Gönüllü' ${nameFilter}
      ORDER BY "applicationDate" DESC
      LIMIT ${limit} OFFSET ${skip}
    `),
    prisma.volunteer.count({where:{organizationId,name}}),
    prisma.application.count({where:{organizationId,name,NOT:{status:'Aktif Gönüllü'}}}),
  ]);
  const total=volunteerTotal+applicationTotal;
  return sendSuccess(res, {applications:items,pagination:{total,page,limit,totalPages:Math.ceil(total/limit)}});
}));

router.get('/',asyncHandler(async(req:OrganizationRequest,res)=>{
  const {page,limit,skip}=pageParams(req,10); const search=String(req.query.search||''); const timeFilter=String(req.query.timeFilter||'tümü'); let createdAt:Date|undefined;
  if(timeFilter==='hafta')createdAt=new Date(Date.now()-7*86400000); if(timeFilter==='ay')createdAt=new Date(Date.now()-30*86400000);
  const where={organizationId:req.organizationId!,...(search?{name:{contains:search,mode:'insensitive' as const}}:{}),...(createdAt?{createdAt:{gte:createdAt}}:{})};
  const [items,total]=await Promise.all([prisma.application.findMany({where,orderBy:{id:'desc'},skip,take:limit}),prisma.application.count({where})]);
  return sendSuccess(res, {applications:items.map(applicationDto),pagination:{total,page,limit,totalPages:Math.ceil(total/limit)}});
}));

router.get('/:id',asyncHandler(async(req:OrganizationRequest,res)=>{
  const id=Number(req.params.id); if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Geçersiz başvuru numarası'});
  const item=await prisma.application.findFirst({where:{id,organizationId:req.organizationId!}}); if(!item)return res.status(404).json({error:'Başvuru bulunamadı'}); return sendSuccess(res, applicationDto(item));
}));

router.put('/:id/status',asyncHandler(async(req:OrganizationRequest,res)=>{
  const id=Number(req.params.id); const status=String(req.body?.status); if(!['İşlem Bekliyor','Reddedildi','Aktif Gönüllü'].includes(status))return res.status(400).json({error:'Geçersiz başvuru durumu'});
  const application=await prisma.application.findFirst({where:{id,organizationId:req.organizationId!}}); if(!application)return res.status(404).json({error:'Başvuru bulunamadı'});
  if(status==='Aktif Gönüllü'){
    const volunteerId=await prisma.$transaction(async tx=>{
      const volunteer=await tx.volunteer.create({data:{organizationId:req.organizationId!,name:application.name,city:application.city,gender:application.gender,age:application.age,education:application.education,active:true}});
      await tx.volunteerProfile.create({data:{volunteerId:volunteer.id,volunteerCode:`#${String(volunteer.id).padStart(5,'0')}`,phone:application.phone,email:application.email,address:application.address,coverLetter:application.coverLetter}});
      const interests=application.interests?JSON.parse(application.interests):[]; if(Array.isArray(interests)&&interests.length)await tx.volunteerInterest.createMany({data:interests.map((interest:unknown)=>({volunteerId:volunteer.id,interest:String(interest)})),skipDuplicates:true});
      await tx.application.delete({where:{id}}); return volunteer.id;
    });
    return sendSuccess(res, {status:'Aktif Gönüllü',volunteerId});
  }
  const updated=await prisma.application.update({where:{id},data:{status}}); return sendSuccess(res, applicationDto(updated));
}));

router.post('/',validate(body(application)),asyncHandler(async(req:OrganizationRequest,res)=>{
  const {name,city,gender,age,education,phone,email,address,interests,coverLetter}=req.body; if(!name||!city||!gender||!age)return res.status(400).json({error:'Tüm alanlar zorunludur'});
  const created = await prisma.$transaction(async tx => {
    const item = await tx.application.create({ data: {
      organizationId: req.organizationId!, name, city, gender, age, education,
      phone: phone || null, email: email || null, address: address || null,
      interests: interests ? JSON.stringify(interests) : null, coverLetter: coverLetter || null,
    } });
    await tx.notification.create({ data: { organizationId: req.organizationId!, userId: req.user!.id, message: `${name} için yeni gönüllü başvurusu kaydedildi.` } });
    return item;
  });
  return sendCreated(res, applicationDto(created));
}));

router.delete('/:id',asyncHandler(async(req:OrganizationRequest,res)=>{
  const id=Number(req.params.id); if(!await prisma.application.count({where:{id,organizationId:req.organizationId!}}))return res.status(404).json({error:'Başvuru bulunamadı'}); await prisma.application.delete({where:{id}}); return sendSuccess(res, {message:'Başvuru silindi'});
}));

export default router;
