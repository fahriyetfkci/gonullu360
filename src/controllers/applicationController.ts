import { Router, Request } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../db/prisma';
import { authMiddleware, requireManager } from '../middleware/auth';
import { organizationContext, OrganizationRequest } from '../middleware/organization';

const router = Router();
router.use(organizationContext);
const pageParams = (req: Request, defaultLimit: number) => { const page=Math.max(1,Number(req.query.page)||1); const limit=Math.min(100,Math.max(1,Number(req.query.limit)||defaultLimit)); return {page,limit,skip:(page-1)*limit}; };
type ApplicationRecord = Prisma.ApplicationGetPayload<Record<string, never>>;
const applicationDto = (item: ApplicationRecord) => ({id:item.id,name:item.name,city:item.city,gender:item.gender,age:item.age,education:item.education,status:item.status,created_at:item.createdAt,applicationDate:item.createdAt,phone:item.phone,email:item.email,address:item.address,interests:item.interests?JSON.parse(item.interests):[],coverLetter:item.coverLetter,evaluationNote:item.evaluationNote});

router.get('/all',async(req:OrganizationRequest,res)=>{
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
  return res.json({applications:items,pagination:{total,page,limit,totalPages:Math.ceil(total/limit)}});
});

router.get('/',async(req:OrganizationRequest,res)=>{
  const {page,limit,skip}=pageParams(req,10); const search=String(req.query.search||''); const timeFilter=String(req.query.timeFilter||'tümü'); let createdAt:Date|undefined;
  if(timeFilter==='hafta')createdAt=new Date(Date.now()-7*86400000); if(timeFilter==='ay')createdAt=new Date(Date.now()-30*86400000);
  const where={organizationId:req.organizationId!,...(search?{name:{contains:search,mode:'insensitive' as const}}:{}),...(createdAt?{createdAt:{gte:createdAt}}:{})};
  const [items,total]=await Promise.all([prisma.application.findMany({where,orderBy:{id:'desc'},skip,take:limit}),prisma.application.count({where})]);
  return res.json({applications:items.map(applicationDto),pagination:{total,page,limit,totalPages:Math.ceil(total/limit)}});
});

router.get('/:id',async(req:OrganizationRequest,res)=>{
  const id=Number(req.params.id); if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'Geçersiz başvuru numarası'});
  const item=await prisma.application.findFirst({where:{id,organizationId:req.organizationId!}}); if(!item)return res.status(404).json({error:'Başvuru bulunamadı'}); return res.json(applicationDto(item));
});

router.put('/:id/status',authMiddleware,requireManager,async(req:OrganizationRequest,res)=>{
  const id=Number(req.params.id); const status=String(req.body?.status); if(!['İşlem Bekliyor','Reddedildi','Aktif Gönüllü'].includes(status))return res.status(400).json({error:'Geçersiz başvuru durumu'});
  const application=await prisma.application.findFirst({where:{id,organizationId:req.organizationId!}}); if(!application)return res.status(404).json({error:'Başvuru bulunamadı'});
  if(status==='Aktif Gönüllü'){
    const volunteerId=await prisma.$transaction(async tx=>{
      const volunteer=await tx.volunteer.create({data:{organizationId:req.organizationId!,name:application.name,city:application.city,gender:application.gender,age:application.age,education:application.education,active:true}});
      await tx.volunteerProfile.create({data:{volunteerId:volunteer.id,volunteerCode:`#${String(volunteer.id).padStart(5,'0')}`,birthDate:new Date(Date.UTC(new Date().getUTCFullYear()-application.age,0,1)),phone:application.phone,email:application.email,address:application.address,coverLetter:application.coverLetter}});
      const interests=application.interests?JSON.parse(application.interests):[]; if(Array.isArray(interests)&&interests.length)await tx.volunteerInterest.createMany({data:interests.map((interest:unknown)=>({volunteerId:volunteer.id,interest:String(interest)})),skipDuplicates:true});
      await tx.application.delete({where:{id}}); return volunteer.id;
    });
    return res.json({status:'Aktif Gönüllü',volunteerId});
  }
  const updated=await prisma.application.update({where:{id},data:{status}}); return res.json(applicationDto(updated));
});

router.post('/',async(req:OrganizationRequest,res)=>{
  const {name,city,gender,age,education,phone,email,address,interests,coverLetter}=req.body; if(!name||!city||!gender||!age)return res.status(400).json({error:'Tüm alanlar zorunludur'});
  const created=await prisma.application.create({data:{organizationId:req.organizationId!,name:String(name),city:String(city),gender:String(gender),age:Number(age),education:String(education||'Üniversite'),phone:phone||null,email:email||null,address:address||null,interests:Array.isArray(interests)?JSON.stringify(interests):null,coverLetter:coverLetter||null}}); return res.status(201).json(applicationDto(created));
});

router.delete('/:id',authMiddleware,requireManager,async(req:OrganizationRequest,res)=>{
  const id=Number(req.params.id); if(!await prisma.application.count({where:{id,organizationId:req.organizationId!}}))return res.status(404).json({error:'Başvuru bulunamadı'}); await prisma.application.delete({where:{id}}); return res.json({message:'Başvuru silindi'});
});

export default router;
