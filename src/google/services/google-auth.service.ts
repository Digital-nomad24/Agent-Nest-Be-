// src/google/services/google-auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
@Injectable()
export class GoogleAuthService {
  constructor(private AuthService: AuthService) {}

  async generateJwtToken(user: any) {
    const payload = { 
      sub: user.name , 
      email: user.email ,
    };
    
    return this.AuthService.signToken(user.id,String(payload));
  }
}