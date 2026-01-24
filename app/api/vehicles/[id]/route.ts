import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../../_supabase';

export const runtime = 'nodejs';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

const uploadImages = async (files: File[], folderPrefix: string) => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folderPrefix}/${crypto.randomUUID()}.${fileExt}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase
      .storage
      .from('ERP')
      .upload(fileName, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      throw new Error(`Lỗi upload ảnh "${file.name}": ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('ERP')
      .getPublicUrl(fileName);

    if (urlData?.publicUrl) {
      uploadedUrls.push(urlData.publicUrl);
    }
  }

  return uploadedUrls;
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow UPDATE.');
    }

    const { id } = await params;
    const vehicleId = id;
    if (!vehicleId) {
      return errorResponse('Vehicle ID is required', 400);
    }

    const formData = await request.formData();
    const dataField = formData.get('data');
    if (!dataField || typeof dataField !== 'string') {
      return errorResponse('Thiếu dữ liệu xe', 400);
    }

    const vehicleData = JSON.parse(dataField);
    const originalVin = (vehicleData?.originalVin || '').toUpperCase();
    const newVin = (vehicleData?.vin || '').toUpperCase();

    if (newVin && originalVin && newVin !== originalVin) {
      const { data: existingVehicle, error: checkError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('vin', newVin)
        .single();

      if (existingVehicle) {
        return errorResponse(`Số VIN "${newVin}" đã tồn tại trong hệ thống.`, 400);
      }
      if (checkError && checkError.code !== 'PGRST116') {
        return errorResponse(checkError.message || 'Lỗi kiểm tra VIN');
      }
    }

    const existingImages = Array.isArray(vehicleData?.existingImages) ? vehicleData.existingImages : [];
    const imageFiles = formData.getAll('images').filter((item): item is File => item instanceof File);
    const uploadedImageUrls = imageFiles.length > 0
      ? await uploadImages(imageFiles, `vehicle-${vehicleId}`)
      : [];

    const payload = {
      ...vehicleData,
      vin: newVin || vehicleData?.vin,
      images: [...existingImages, ...uploadedImageUrls]
    };

    delete payload.originalVin;
    delete payload.existingImages;

    const { data, error } = await supabase
      .from('vehicles')
      .update(payload)
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      return errorResponse(error.message || 'Lỗi cập nhật xe');
    }

    return NextResponse.json({ vehicle: data });
  } catch (error: any) {
    console.error('Error in vehicles update API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật xe');
  }
}
