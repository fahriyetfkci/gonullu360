import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { config } from '../config';

export interface VolunteerProfileUpdate { birthDate?:string|null;department?:string|null;phone?:string|null;email?:string|null;address?:string|null;photoUrl?:string|null;managerNote?:string|null;coverLetter?:string|null;interests?:string[]; }

export async function getVolunteerProfile(id:number,organizationId:string){
  const volunteer=await prisma.volunteer.findFirst({where:{id,organizationId},include:{profile:{include:{managerNoteAuthor:{select:{id:true,name:true,role:true}}}},interests:{orderBy:{interest:'asc'}},educations:{orderBy:[{current:'desc'},{endYear:'desc'},{startYear:'desc'}]},participants:{include:{event:true},orderBy:{event:{date:'desc'}}}}});
  if(!volunteer)return undefined;
  const events=volunteer.participants.map(({event})=>({id:event.id,name:event.name,date:event.date,completed:event.completed}));
  const completedCount=events.filter(event=>event.completed).length;
  const participationScore=events.length===0?0:Math.min(100,Math.round(completedCount/events.length*70+Math.min(events.length,6)/6*30));
  const p=volunteer.profile;
  const profileFields=[p?.phone,p?.email,p?.address,p?.birthDate,p?.department,p?.photoUrl];
  return{dataSource:config.appMode==='demo'?'demo':'real',id:volunteer.id,volunteerCode:p?.volunteerCode??`#${String(id).padStart(5,'0')}`,name:volunteer.name,status:volunteer.active?'Aktif Gönüllü':'Pasif Gönüllü',active:volunteer.active,city:volunteer.city,department:p?.department??null,gender:volunteer.gender,age:volunteer.age,birthDate:p?.birthDate??null,education:volunteer.education,joinedAt:volunteer.createdAt,photoUrl:p?.photoUrl??null,contact:{phone:p?.phone??null,email:p?.email??null,address:p?.address??null},interests:volunteer.interests.map(item=>item.interest),educations:volunteer.educations, scores:{volunteering:Math.round(profileFields.filter(Boolean).length/profileFields.length*100),participation:participationScore},targets:{volunteering:p?.volunteeringTarget??80,participation:p?.participationTarget??70},lastEvent:events[0]??null,events,managerNote:p?.managerNote??null,managerNoteMeta:p?.managerNote?{authorId:p.managerNoteAuthor?.id??null,authorName:p.managerNoteAuthor?.name??null,authorRole:p.managerNoteAuthor?.role??null,updatedAt:p.managerNoteUpdatedAt}:null,coverLetter:p?.coverLetter??null,summary:{applicationCount:0,trainingCount:0,eventCount:events.length,documentCount:0,taskCount:0}};
}

export async function updateVolunteerProfile(id:number,organizationId:string,input:VolunteerProfileUpdate,actorUserId?:string){
  if(!await prisma.volunteer.count({where:{id,organizationId}}))return undefined;
  const noteChanged=input.managerNote!==undefined;
  const noteExists=Boolean(input.managerNote?.trim());
  const data:Prisma.VolunteerProfileUncheckedUpdateInput={};
  if(input.birthDate!==undefined)data.birthDate=input.birthDate?new Date(`${input.birthDate}T00:00:00Z`):null;
  for(const key of ['department','phone','email','address','photoUrl','managerNote','coverLetter'] as const)if(input[key]!==undefined)data[key]=input[key];
  if(noteChanged){data.managerNoteAuthorId=noteExists?(actorUserId??null):null;data.managerNoteUpdatedAt=noteExists?new Date():null;}
  await prisma.$transaction(async tx=>{
    await tx.volunteerProfile.upsert({where:{volunteerId:id},create:{...data as Prisma.VolunteerProfileUncheckedCreateInput,volunteerId:id,volunteerCode:`#${String(id).padStart(5,'0')}`},update:data});
    if(input.interests!==undefined){await tx.volunteerInterest.deleteMany({where:{volunteerId:id}});const interests=[...new Set(input.interests.map(item=>item.trim()).filter(Boolean))];if(interests.length)await tx.volunteerInterest.createMany({data:interests.map(interest=>({volunteerId:id,interest}))});}
  });
  return getVolunteerProfile(id,organizationId);
}
