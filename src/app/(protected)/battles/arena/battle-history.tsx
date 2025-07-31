'use client'

import { useState } from 'react'

import { formatDistanceToNow } from 'date-fns'
import {
  Trophy,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Award
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib'
import type { Battle } from '@/types/battle'

interface BattleHistoryProps {
  battles: Battle[]
  userId: number
}

export function BattleHistory({ battles, userId }: BattleHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const battlesPerPage = 10

  const totalPages = Math.ceil(battles.length / battlesPerPage)
  const startIndex = (currentPage - 1) * battlesPerPage
  const endIndex = startIndex + battlesPerPage
  const currentBattles = battles.slice(startIndex, endIndex)

  const getBattleResult = (battle: Battle) => {
    if (battle.winnerId === userId) {
      return {
        result: 'Victory',
        color: 'text-green-600',
        icon: Trophy,
        badge: 'bg-green-100 text-green-800'
      }
    }
    return {
      result: 'Defeat',
      color: 'text-red-600',
      icon: Shield,
      badge: 'bg-red-100 text-red-800'
    }
  }

  const getPlayerCP = (battle: Battle) => {
    return battle.player1Id === userId ? battle.player1CP : battle.player2CP
  }

  const getOpponentCP = (battle: Battle) => {
    return battle.player1Id === userId ? battle.player2CP : battle.player1CP
  }

  if (battles.length === 0) {
    return (
      <Card>
        <CardContent className='py-12 text-center'>
          <Shield className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
          <h3 className='mb-2 text-lg font-semibold'>No Battles Yet</h3>
          <p className='text-muted-foreground'>
            Start battling to see your history here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Battle History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Result</TableHead>
                  <TableHead>Your CP</TableHead>
                  <TableHead>Opponent CP</TableHead>
                  <TableHead>CP Difference</TableHead>
                  <TableHead>Rewards</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentBattles.map(battle => {
                  const battleResult = getBattleResult(battle)
                  const playerCP = getPlayerCP(battle)
                  const opponentCP = getOpponentCP(battle)
                  const cpDiff = playerCP - opponentCP

                  return (
                    <TableRow key={battle.id}>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <battleResult.icon
                            className={cn('h-4 w-4', battleResult.color)}
                          />
                          <Badge
                            variant='secondary'
                            className={battleResult.badge}
                          >
                            {battleResult.result}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='font-medium'>{playerCP}</div>
                      </TableCell>
                      <TableCell>
                        <div className='font-medium'>{opponentCP}</div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          {cpDiff > 0 ? (
                            <TrendingUp className='h-4 w-4 text-green-500' />
                          ) : cpDiff < 0 ? (
                            <TrendingDown className='h-4 w-4 text-red-500' />
                          ) : null}
                          <span
                            className={cn(
                              'font-medium',
                              cpDiff > 0 && 'text-green-600',
                              cpDiff < 0 && 'text-red-600'
                            )}
                          >
                            {cpDiff > 0 && '+'}
                            {cpDiff}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {battle.winnerId === userId ? (
                          <div className='flex flex-col gap-1'>
                            <div className='flex items-center gap-1'>
                              <Award className='h-3 w-3 text-yellow-500' />
                              <span className='text-sm'>
                                {battle.feeDiscountPercent || 25}% discount
                              </span>
                            </div>
                            <div className='flex items-center gap-1'>
                              <Trophy className='h-3 w-3 text-blue-500' />
                              <span className='text-sm text-blue-600 dark:text-blue-400'>
                                +{battle.winnerXP || 50} XP
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className='flex items-center gap-1'>
                            <Shield className='h-3 w-3 text-gray-500' />
                            <span className='text-muted-foreground text-sm'>
                              +{battle.loserXP || 10} XP
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className='text-muted-foreground flex items-center gap-1 text-sm'>
                          <Clock className='h-3 w-3' />
                          {formatDistanceToNow(new Date(battle.createdAt), {
                            addSuffix: true
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='mt-4 flex items-center justify-between'>
              <p className='text-muted-foreground text-sm'>
                Showing {startIndex + 1} to {Math.min(endIndex, battles.length)}{' '}
                of {battles.length} battles
              </p>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className='h-4 w-4' />
                  Previous
                </Button>
                <div className='flex items-center gap-1'>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      )
                    })
                    .map((page, index, array) => {
                      if (index > 0 && array[index - 1] !== page - 1) {
                        return (
                          <span key={`ellipsis-${page}`} className='px-2'>
                            ...
                          </span>
                        )
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size='sm'
                          onClick={() => setCurrentPage(page)}
                          className='h-8 w-8 p-0'
                        >
                          {page}
                        </Button>
                      )
                    })}
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setCurrentPage(prev => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
