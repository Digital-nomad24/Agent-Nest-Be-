import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';

export class UserSignUpDto{
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()  
  @IsEmail()
  email: string;
  
  @IsNotEmpty()
  @IsString()
  @Length(6,20)
  password: string;

}
export class UserSignInDto {
  @IsNotEmpty()  
  @IsEmail()
  email: string;
  
  @IsNotEmpty()
  @IsString()
  @Length(6,20)
  password: string;
}