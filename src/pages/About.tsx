import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Shield, Zap, Users, Heart, ExternalLink } from 'lucide-react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function About() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Smartphone,
      title: 'Progressive Web App',
      description: 'Works offline and can be installed on any device'
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'All data stays on your device - no cloud servers'
    },
    {
      icon: Zap,
      title: 'Fast & Efficient',
      description: 'Optimized for quick workout logging and tracking'
    },
    {
      icon: Users,
      title: 'Open Source',
      description: 'Built with modern web technologies'
    }
  ];

  const technologies = [
    'React 18',
    'TypeScript',
    'Tailwind CSS',
    'Vite',
    'Dexie (IndexedDB)',
    'Chart.js',
    'PWA'
  ];

  const changelog = [
    {
      version: '1.0.0',
      date: '2025-08-15',
      changes: [
        'Initial release with core workout tracking',
        'Exercise library with custom exercises',
        'Progress tracking and analytics',
        'Body measurements tracking',
        'Import/Export functionality',
        'PWA support with offline capabilities'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="About FitNotesX" 
        onMenuClick={() => navigate(-1)}
      />
      
      <div className="p-4 space-y-6 pb-20">
        {/* App Info */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">FitNotesX</CardTitle>
            <p className="text-muted-foreground">
              Your personal workout companion
            </p>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex justify-center space-x-4">
              <Badge variant="secondary">Version 1.0.0</Badge>
              <Badge variant="secondary">PWA Ready</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              FitNotesX is a comprehensive workout tracking application designed to help you 
              monitor your fitness progress, track exercises, and analyze your performance 
              over time. Built with privacy and simplicity in mind.
            </p>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Technologies */}
        <Card>
          <CardHeader>
            <CardTitle>Built With</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech, index) => (
                <Badge key={index} variant="outline">
                  {tech}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              FitNotesX is built using modern web technologies to ensure fast performance, 
              reliability, and a great user experience across all devices.
            </p>
          </CardContent>
        </Card>

        {/* Changelog */}
        <Card>
          <CardHeader>
            <CardTitle>Changelog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {changelog.map((release, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Version {release.version}</h4>
                      <p className="text-sm text-muted-foreground">{release.date}</p>
                    </div>
                    <Badge variant="default">Latest</Badge>
                  </div>
                  
                  <ul className="space-y-1">
                    {release.changes.map((change, changeIndex) => (
                      <li key={changeIndex} className="text-sm text-muted-foreground flex items-start">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-2 flex-shrink-0" />
                        {change}
                      </li>
                    ))}
                  </ul>
                  
                  {index < changelog.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Privacy & Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Your Data, Your Control</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-success rounded-full mt-2 mr-2 flex-shrink-0" />
                  All data is stored locally on your device using IndexedDB
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-success rounded-full mt-2 mr-2 flex-shrink-0" />
                  No data is transmitted to external servers or cloud services
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-success rounded-full mt-2 mr-2 flex-shrink-0" />
                  You have full control over your data with export/import features
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-success rounded-full mt-2 mr-2 flex-shrink-0" />
                  No tracking, analytics, or data collection
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* License */}
        <Card>
          <CardHeader>
            <CardTitle>License & Credits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Open Source</h4>
              <p className="text-sm text-muted-foreground">
                FitNotesX is built with open source technologies and follows best practices 
                for web development. The application is designed to be transparent, secure, 
                and respectful of user privacy.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Third-Party Libraries</h4>
              <p className="text-sm text-muted-foreground">
                This application uses various open source libraries including React, 
                Tailwind CSS, Lucide Icons, and others. We're grateful to the open 
                source community for making these tools available.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle>Support & Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              FitNotesX is continuously being improved. Your feedback helps make it better 
              for everyone. If you encounter any issues or have suggestions, we'd love to hear from you.
            </p>
            
            <div className="text-center">
              <p className="text-sm font-medium mb-2">Made with ❤️ for fitness enthusiasts</p>
              <p className="text-xs text-muted-foreground">
                © 2025 FitNotesX. All rights reserved.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}