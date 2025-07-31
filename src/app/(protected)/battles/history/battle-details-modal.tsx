'use client'

import {
  Trophy,
  Shield,
  Swords,
  Clock,
  TrendingUp,
  TrendingDown,
  Sparkles,
  User,
  Heart,
  Zap,
  ShieldCheck
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib'
import type { BattleWithDetails } from '@/lib/db/queries/battles'
import { formatRelativeTime, formatFullDateTime } from '@/lib/utils/string'

interface BattleDetailsModalProps {
  battle: BattleWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number
}

interface RoundHistory {
  round: number
  player1Damage: number
  player2Damage: number
  player1Defended: number
  player2Defended: number
  player1Health: number
  player2Health: number
  timestamp: string
}

export function BattleDetailsModal({
  battle,
  open,
  onOpenChange,
  userId
}: BattleDetailsModalProps) {
  if (!battle) return null

  const isWinner = battle.winnerId === userId
  const isPlayer1 = battle.player1Id === userId
  const playerCP = isPlayer1 ? battle.player1CP : battle.player2CP
  const opponentCP = isPlayer1 ? battle.player2CP : battle.player1CP
  const cpDifference = playerCP - opponentCP

  // Parse round history from battle state if available
  const roundHistory: RoundHistory[] = (battle as any).roundHistory || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Swords className='h-5 w-5 text-purple-500' />
            Battle Details
          </DialogTitle>
          <DialogDescription>
            {formatRelativeTime(battle.createdAt)} •{' '}
            {formatFullDateTime(battle.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Battle Result Summary */}
          <div className='flex items-center justify-between rounded-lg border p-4'>
            <div className='flex items-center gap-4'>
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full',
                  isWinner
                    ? 'bg-green-100 dark:bg-green-900/20'
                    : 'bg-red-100 dark:bg-red-900/20'
                )}
              >
                {isWinner ? (
                  <Trophy className='h-6 w-6 text-green-600 dark:text-green-400' />
                ) : (
                  <Shield className='h-6 w-6 text-red-600 dark:text-red-400' />
                )}
              </div>
              <div>
                <p className='text-lg font-bold'>
                  {isWinner ? 'VICTORY' : 'DEFEAT'}
                </p>
                <p className='text-muted-foreground text-sm'>
                  Your CP: {playerCP} | Opponent CP: {opponentCP}
                </p>
                {battle.endReason && (
                  <Badge
                    className={cn(
                      'mt-1 text-xs',
                      battle.endReason === 'timeout'
                        ? 'bg-orange-500/20 text-orange-500 dark:text-orange-400'
                        : 'bg-red-500/20 text-red-500 dark:text-red-400'
                    )}
                  >
                    {battle.endReason === 'timeout' ? (
                      <>
                        ⏱️{' '}
                        {isWinner
                          ? 'Won by Timeout - Higher HP'
                          : battle.winnerId
                            ? 'Lost by Timeout - Lower HP'
                            : 'Draw - Timeout'}
                      </>
                    ) : (
                      <>
                        💀{' '}
                        {isWinner
                          ? 'Won by Knockout - Opponent 0 HP'
                          : 'Lost by Knockout - Your HP Reached 0'}
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </div>
            <div className='text-right'>
              {cpDifference !== 0 && (
                <div className='flex items-center gap-1'>
                  {cpDifference > 0 ? (
                    <TrendingUp className='h-4 w-4 text-green-600' />
                  ) : (
                    <TrendingDown className='h-4 w-4 text-red-600' />
                  )}
                  <span
                    className={cn(
                      'font-mono text-sm font-bold',
                      cpDifference > 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {cpDifference > 0 ? '+' : ''}
                    {cpDifference}
                  </span>
                </div>
              )}
              {(battle.winnerXP || battle.loserXP) && (
                <Badge
                  variant='secondary'
                  className='mt-2 bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                >
                  <Sparkles className='mr-1 h-3 w-3' />+
                  {isWinner ? battle.winnerXP || 50 : battle.loserXP || 10} XP
                </Badge>
              )}
            </div>
          </div>

          {/* Boxing Match Scorecard */}
          {roundHistory.length > 0 && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-bold'>Official Scorecard</h3>
                <Badge variant='outline' className='font-mono'>
                  {roundHistory.length} Rounds
                </Badge>
              </div>

              {/* Fighter Cards */}
              <div className='grid grid-cols-2 gap-4'>
                {/* Player Card */}
                <Card className='relative overflow-hidden border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent'>
                  <div className='absolute top-0 right-0 h-24 w-24 bg-blue-500/10 blur-3xl' />
                  <div className='relative p-4'>
                    <div className='mb-3 flex items-center gap-2'>
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20'>
                        <User className='h-5 w-5 text-blue-500' />
                      </div>
                      <div>
                        <p className='text-xs font-semibold text-blue-500'>
                          BLUE CORNER
                        </p>
                        <p className='text-lg font-bold'>You</p>
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-sm'>
                          Combat Power
                        </span>
                        <span className='font-mono text-sm font-bold'>
                          {playerCP}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-sm'>
                          Total Damage
                        </span>
                        <span className='font-mono text-sm font-bold text-red-500'>
                          {roundHistory.reduce(
                            (sum, r) =>
                              sum +
                              (isPlayer1 ? r.player1Damage : r.player2Damage),
                            0
                          )}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-sm'>
                          Defense
                        </span>
                        <span className='font-mono text-sm font-bold text-blue-500'>
                          {roundHistory.reduce(
                            (sum, r) =>
                              sum +
                              (isPlayer1
                                ? r.player1Defended
                                : r.player2Defended),
                            0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Opponent Card */}
                <Card className='relative overflow-hidden border-2 border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent'>
                  <div className='absolute top-0 left-0 h-24 w-24 bg-red-500/10 blur-3xl' />
                  <div className='relative p-4'>
                    <div className='mb-3 flex items-center gap-2'>
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20'>
                        <User className='h-5 w-5 text-red-500' />
                      </div>
                      <div>
                        <p className='text-xs font-semibold text-red-500'>
                          RED CORNER
                        </p>
                        <p className='text-lg font-bold'>Opponent</p>
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-sm'>
                          Combat Power
                        </span>
                        <span className='font-mono text-sm font-bold'>
                          {opponentCP}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-sm'>
                          Total Damage
                        </span>
                        <span className='font-mono text-sm font-bold text-red-500'>
                          {roundHistory.reduce(
                            (sum, r) =>
                              sum +
                              (isPlayer1 ? r.player2Damage : r.player1Damage),
                            0
                          )}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-sm'>
                          Defense
                        </span>
                        <span className='font-mono text-sm font-bold text-blue-500'>
                          {roundHistory.reduce(
                            (sum, r) =>
                              sum +
                              (isPlayer1
                                ? r.player2Defended
                                : r.player1Defended),
                            0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Round by Round Scorecard */}
              <Card className='overflow-hidden border-2'>
                <div className='bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4'>
                  <h4 className='flex items-center gap-2 text-sm font-bold tracking-wider uppercase'>
                    <Swords className='h-4 w-4' />
                    Round-by-Round Action
                  </h4>
                </div>
                <ScrollArea className='h-[280px]'>
                  <div className='p-4'>
                    <table className='w-full'>
                      <thead>
                        <tr className='border-b text-sm'>
                          <th className='pb-2 text-left font-semibold'>
                            Round
                          </th>
                          <th className='pb-2 text-center font-semibold text-blue-500'>
                            Blue Corner
                          </th>
                          <th className='pb-2 text-center'>VS</th>
                          <th className='pb-2 text-center font-semibold text-red-500'>
                            Red Corner
                          </th>
                          <th className='pb-2 text-right font-semibold'>
                            Health
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {roundHistory.map((round, index) => {
                          const playerDamage = isPlayer1
                            ? round.player1Damage
                            : round.player2Damage
                          const opponentDamage = isPlayer1
                            ? round.player2Damage
                            : round.player1Damage
                          const playerDefended = isPlayer1
                            ? round.player1Defended
                            : round.player2Defended
                          const opponentDefended = isPlayer1
                            ? round.player2Defended
                            : round.player1Defended
                          const playerHealth = isPlayer1
                            ? round.player1Health
                            : round.player2Health
                          const opponentHealth = isPlayer1
                            ? round.player2Health
                            : round.player1Health

                          const playerWonRound = playerDamage > opponentDamage
                          const opponentWonRound = opponentDamage > playerDamage

                          return (
                            <tr
                              key={index}
                              className='hover:bg-muted/50 border-b transition-colors'
                            >
                              <td className='py-3'>
                                <Badge
                                  variant='outline'
                                  className='font-mono text-xs'
                                >
                                  R{round.round}
                                </Badge>
                              </td>
                              <td className='py-3 text-center'>
                                <div className='flex items-center justify-center gap-2'>
                                  {playerDamage > 0 && (
                                    <div className='flex items-center gap-1'>
                                      <Zap className='h-3 w-3 text-orange-500' />
                                      <span className='font-mono text-sm font-bold text-orange-500'>
                                        {playerDamage}
                                      </span>
                                    </div>
                                  )}
                                  {playerDefended > 0 && (
                                    <div className='flex items-center gap-1'>
                                      <ShieldCheck className='h-3 w-3 text-blue-500' />
                                      <span className='font-mono text-sm text-blue-500'>
                                        {playerDefended}
                                      </span>
                                    </div>
                                  )}
                                  {playerWonRound && (
                                    <Badge className='ml-1 h-5 bg-green-500/20 text-green-600'>
                                      WIN
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className='text-muted-foreground py-3 text-center text-xs'>
                                VS
                              </td>
                              <td className='py-3 text-center'>
                                <div className='flex items-center justify-center gap-2'>
                                  {opponentWonRound && (
                                    <Badge className='mr-1 h-5 bg-green-500/20 text-green-600'>
                                      WIN
                                    </Badge>
                                  )}
                                  {opponentDamage > 0 && (
                                    <div className='flex items-center gap-1'>
                                      <Zap className='h-3 w-3 text-orange-500' />
                                      <span className='font-mono text-sm font-bold text-orange-500'>
                                        {opponentDamage}
                                      </span>
                                    </div>
                                  )}
                                  {opponentDefended > 0 && (
                                    <div className='flex items-center gap-1'>
                                      <ShieldCheck className='h-3 w-3 text-blue-500' />
                                      <span className='font-mono text-sm text-blue-500'>
                                        {opponentDefended}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className='py-3 text-right'>
                                <div className='flex items-center justify-end gap-3 text-xs'>
                                  <div className='flex items-center gap-1'>
                                    <Heart className='h-3 w-3 text-blue-500' />
                                    <span className='font-mono font-bold'>
                                      {playerHealth}
                                    </span>
                                  </div>
                                  <span className='text-muted-foreground'>
                                    |
                                  </span>
                                  <div className='flex items-center gap-1'>
                                    <Heart className='h-3 w-3 text-red-500' />
                                    <span className='font-mono font-bold'>
                                      {opponentHealth}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </Card>
            </div>
          )}

          {/* Battle Stats */}
          <div>
            <h3 className='text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase'>
              Battle Statistics
            </h3>
            <div className='grid grid-cols-3 gap-3'>
              <div className='bg-card rounded-lg border p-3 text-center'>
                <Clock className='text-muted-foreground mx-auto mb-1 h-4 w-4' />
                <p className='text-2xl font-bold'>{roundHistory.length || 0}</p>
                <p className='text-muted-foreground text-xs'>Total Rounds</p>
              </div>
              <div className='bg-card rounded-lg border p-3 text-center'>
                <Swords className='text-muted-foreground mx-auto mb-1 h-4 w-4' />
                <p className='text-2xl font-bold'>
                  {roundHistory.reduce(
                    (sum, r) =>
                      sum + (isPlayer1 ? r.player1Damage : r.player2Damage),
                    0
                  )}
                </p>
                <p className='text-muted-foreground text-xs'>Damage Dealt</p>
              </div>
              <div className='bg-card rounded-lg border p-3 text-center'>
                <Shield className='text-muted-foreground mx-auto mb-1 h-4 w-4' />
                <p className='text-2xl font-bold'>
                  {roundHistory.reduce(
                    (sum, r) =>
                      sum + (isPlayer1 ? r.player1Defended : r.player2Defended),
                    0
                  )}
                </p>
                <p className='text-muted-foreground text-xs'>Damage Blocked</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Close Button */}
          <div className='flex justify-end'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
