import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return "Cannot find localFilePath";
    // upload file on cloudinary
    // have to log response

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // file has been uploaded successfully
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // remove the locally saved file as the upload opereation got failed
    fs.unlinkSync(localFilePath);
    return "file removed successfully after upload proccess got failed";
  }
};

const deleteFileOnCloudinary = async (oldFileUrl) => {
  try {
    if (!oldFileUrl) return "cannot find public old avatar url";
    const publicId = oldFileUrl.split("/").pop().split(".")[0];

    const response = await cloudinary.api.delete_resources([publicId], {
      type: "upload",
      resource_type: "auto",
    });
    return response;
  } catch (error) {
    return "error while deleting the file";
  }
};

export { uploadOnCloudinary, deleteFileOnCloudinary };
