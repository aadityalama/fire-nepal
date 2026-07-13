import { PROFILE_AVATAR_IMG_CLASS } from "@/lib/profile-avatar-ui";

type ProfileAvatarImageProps = {
  src: string;
  alt?: string;
  onError?: () => void;
};

/** Constrained profile avatar image — never sizes from intrinsic image dimensions. */
export function ProfileAvatarImage({ src, alt = "", onError }: ProfileAvatarImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={PROFILE_AVATAR_IMG_CLASS} onError={onError} />
  );
}
