-- AddForeignKey
ALTER TABLE "public"."Material" ADD CONSTRAINT "Material_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
